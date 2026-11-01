/**
 * Flippy v4 — Local & LAN Studio Server + Direct MP4 Stream Proxy
 * Serves Flippy v4 on http://localhost:3000 (and LAN IP for iPhone / Mobile testing)
 * Provides /__flippy_yt_dl and /__flippy_yt_progress with CORS * so both
 * http://localhost:3000 and file:/// index.html receive real muxed .mp4 streams.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav'
};

const BLOCKED_CHANNELS = [
  'crunchyroll', 'crunchyroll collection', 'crunchyroll dubs',
  'netflix', 'netflix anime', 'toei animation', 'muse asia',
  'ani-one asia', 'aniplex', 'vizmedia', 'viz media', 'funimation',
  'kadokawa', 'kadokawaanime', 'mappa', 'mappa channel', 'gundaminfo',
  'bandai namco', 'tms entertainment', 'pony canyon', 'toho animation',
  'shonen jump', 'sony pictures', 'sony pictures entertainment',
  'warner bros. pictures', 'warner bros', 'universal pictures',
  'paramount pictures', 'walt disney studios', 'marvel entertainment',
  '20th century studios', 'lionsgate movies', 'mgm', 'a24',
  'youtube movies', 'prime video', 'hulu', 'peacock', 'hbo', 'max'
];

const BLOCKED_TITLE_PATTERNS = [
  /\bfull\s+movie\b/i,
  /\bfull\s+episode\b/i,
  /\b(?:episode|ep\.?)\s*\d+\s*(?:\||-|\[|\(|full|eng\s*sub|sub|dub)/i,
  /\bs\d{1,2}\s*e\d{1,3}\b/i,
  /\b(?:eng(?:lish)?\s+sub(?:s|titled)?|multi\s*sub)\b.*\b(?:episode|ep\.?\s*\d+|anime)\b/i,
  /\b(?:anime\s+full\s+episode|official\s+episode)\b/i,
  /\b(?:complete\s+feature\s+film|official\s+full\s+movie)\b/i
];

const ALLOWED_FORMATS = new Set([
  '4k', '1440', '1080', '720', '480', '360',
  'mp3', 'm4a', 'aac', 'flac', 'opus', 'wav', 'webm'
]);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
}

function sendJson(res, status, payload) {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function verifyYoutubeCompliance(ytUrl) {
  try {
    const oembedUrl = 'https://www.youtube.com/oembed?url=' + encodeURIComponent(ytUrl) + '&format=json';
    const r = await fetch(oembedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return { allowed: true };
    const meta = await r.json();
    const author = String(meta.author_name || '').toLowerCase().trim();
    const title = String(meta.title || '').trim();

    for (const ch of BLOCKED_CHANNELS) {
      if (author === ch || author.includes(ch)) {
        return {
          allowed: false,
          reason: `Restricted Channel: "${meta.author_name}" is a protected Movie / Anime distributor.`
        };
      }
    }
    for (const pat of BLOCKED_TITLE_PATTERNS) {
      if (pat.test(title)) {
        return {
          allowed: false,
          reason: 'Restricted Content: Title matches protected Full Movie or Anime Episode broadcast pattern.'
        };
      }
    }
    return { allowed: true, meta };
  } catch (_) {
    return { allowed: true };
  }
}

async function fetchUpstreamJson(pathname, queryObj) {
  const hosts = ['https://p.savenow.to', 'https://p.lbserver.xyz'];
  const qs = new URLSearchParams(queryObj).toString();
  let lastErr = null;

  for (const host of hosts) {
    try {
      const targetUrl = `${host}${pathname}?${qs}`;
      const r = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Origin': host,
          'Referer': `${host}/api/button/`,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
          'Accept': 'application/json'
        }
      });
      if (r.ok) {
        return await r.json();
      }
      lastErr = new Error(`Upstream HTTP ${r.status}`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('All upstream MP4 muxer nodes failed');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Health probe for client auto-discovery
  if (parsed.pathname === '/__flippy_yt_ping') {
    return sendJson(res, 200, { ok: true, engine: 'flippy-v4-mp4-muxer' });
  }

  // Step 1: Initiate real MP4 / Audio conversion job
  if (parsed.pathname === '/__flippy_yt_dl') {
    const ytUrl = (parsed.searchParams.get('url') || '').trim();
    const rawFmt = (parsed.searchParams.get('format') || '1080').trim().toLowerCase();
    const format = ALLOWED_FORMATS.has(rawFmt) ? rawFmt : '1080';

    if (!ytUrl || !/(?:youtube\.com|youtu\.be)/i.test(ytUrl)) {
      return sendJson(res, 400, { success: false, error: 'Invalid YouTube URL' });
    }

    const compliance = await verifyYoutubeCompliance(ytUrl);
    if (!compliance.allowed) {
      return sendJson(res, 403, { success: false, error: compliance.reason });
    }

    try {
      const data = await fetchUpstreamJson('/api/v2/download', {
        button: '1',
        format: format,
        iframe_source: 'https://flippy.studio/',
        url: ytUrl
      });
      return sendJson(res, 200, data);
    } catch (err) {
      return sendJson(res, 502, { success: false, error: err.message || 'Upstream muxer unreachable' });
    }
  }

  // Step 2: Poll conversion progress until direct video/mp4 URL is ready
  if (parsed.pathname === '/__flippy_yt_progress') {
    const id = (parsed.searchParams.get('id') || '').trim();
    if (!id) {
      return sendJson(res, 400, { success: false, error: 'Missing conversion job id' });
    }
    try {
      const data = await fetchUpstreamJson('/api/progress', { id });
      return sendJson(res, 200, data);
    } catch (err) {
      return sendJson(res, 502, { success: false, error: err.message || 'Progress poll failed' });
    }
  }

  // Static file serving for Flippy v4
  let relPath = decodeURIComponent(parsed.pathname);
  if (relPath === '/') relPath = '/index.html';

  const safePath = path.normalize(path.join(ROOT_DIR, relPath));
  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    setCors(res);
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(safePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  let lanIp = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        lanIp = net.address;
        break;
      }
    }
  }
  console.log(`[Flippy v4] Studio & MP4 Stream Server listening:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Mobile:  http://${lanIp}:${PORT} (Open on iPhone Safari to test Save to Photos)`);
});
