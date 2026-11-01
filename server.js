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
  'youtube movies',
  'youtube movies & tv',
  'youtube primetime',
  'google play movies & tv',
  'movies & shows'
];

const BLOCKED_TITLE_PATTERNS = [
  /\b(?:buy\s+or\s+rent|rent\s+or\s+buy)\b/i,
  /\b(?:requires\s+purchase|purchase\s+required|paid\s+rental)\b/i
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
          reason: `Blocked: "${meta.author_name}" is a paid YouTube storefront that requires buying or renting this video.`
        };
      }
    }
    for (const pat of BLOCKED_TITLE_PATTERNS) {
      if (pat.test(title)) {
        if (/trailer|teaser|preview|clip/i.test(title)) {
          continue;
        }
        return {
          allowed: false,
          reason: 'Blocked: This video is marked as Buy or Rent and requires purchase on YouTube.'
        };
      }
    }
    return { allowed: true, meta };
  } catch (_) {
    return { allowed: true };
  }
}

const UPSTREAM_HOSTS = ['https://p.savenow.to', 'https://p.lbserver.xyz'];
let preferredHost = null; // last host that answered fastest

// Race all upstream hosts in parallel; first successful JSON wins
async function fetchUpstreamJson(pathname, queryObj) {
  const qs = new URLSearchParams(queryObj).toString();
  const hosts = preferredHost ? [preferredHost, ...UPSTREAM_HOSTS.filter(h => h !== preferredHost)] : UPSTREAM_HOSTS;
  const controllers = hosts.map(() => new AbortController());

  const attempts = hosts.map((host, i) => (async () => {
    const r = await fetch(`${host}${pathname}?${qs}`, {
      method: 'GET',
      signal: controllers[i].signal,
      headers: {
        'Origin': host,
        'Referer': `${host}/api/button/`,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json'
      }
    });
    if (!r.ok) throw new Error(`Upstream HTTP ${r.status}`);
    const json = await r.json();
    return { host, json, i };
  })());

  try {
    const { host, json, i } = await Promise.any(attempts);
    preferredHost = host;
    controllers.forEach((c, j) => { if (j !== i) c.abort(); });
    return json;
  } catch (agg) {
    const first = agg && agg.errors && agg.errors[0];
    throw first || new Error('All upstream MP4 muxer nodes failed');
  }
}

// Detect FFmpeg once at startup for exact bitrate re-encoding
const { spawn, spawnSync } = require('child_process');
const STANDALONE_FFMPEG = 'C:\\Users\\jeduc\\AppData\\Local\\Programs\\Python\\Python312\\Lib\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe';
const FFMPEG_BIN = fs.existsSync(STANDALONE_FFMPEG) ? STANDALONE_FFMPEG : (process.env.FFMPEG_PATH || 'ffmpeg');
let HAS_FFMPEG = false;
try {
  HAS_FFMPEG = spawnSync(FFMPEG_BIN, ['-version'], { stdio: 'ignore', timeout: 4000 }).status === 0;
} catch (_) { HAS_FFMPEG = false; }

function handleTranscode(parsed, req, res) {
  const src = (parsed.searchParams.get('src') || '').trim();
  const ext = (parsed.searchParams.get('ext') || 'mp4').toLowerCase();
  const vb = Math.max(0, Math.min(80000, parseInt(parsed.searchParams.get('vb') || '0', 10) || 0)); // kbps
  const ab = Math.max(0, Math.min(320, parseInt(parsed.searchParams.get('ab') || '0', 10) || 0));    // kbps

  if (!HAS_FFMPEG) return sendJson(res, 501, { success: false, error: 'FFmpeg not installed on server' });
  let srcUrl;
  try { srcUrl = new URL(src); } catch (_) { return sendJson(res, 400, { success: false, error: 'Bad src' }); }
  if (srcUrl.protocol !== 'https:' || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(srcUrl.hostname)) {
    return sendJson(res, 400, { success: false, error: 'src must be a public https URL' });
  }

  const args = ['-hide_banner', '-loglevel', 'error', '-i', srcUrl.href];
  let mime = 'video/mp4';
  if (ext === 'mp3') {
    args.push('-vn', '-c:a', 'libmp3lame', '-b:a', `${ab || 320}k`, '-f', 'mp3');
    mime = 'audio/mpeg';
  } else if (ext === 'm4a') {
    args.push('-vn', '-c:a', 'aac', '-b:a', `${ab || 256}k`, '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4');
    mime = 'audio/mp4';
  } else {
    if (vb > 0) args.push('-c:v', 'libx264', '-preset', 'veryfast', '-b:v', `${vb}k`, '-maxrate', `${vb}k`, '-bufsize', `${vb * 2}k`, '-pix_fmt', 'yuv420p');
    else args.push('-c:v', 'copy');
    if (ab > 0) args.push('-c:a', 'aac', '-b:a', `${ab}k`);
    else args.push('-c:a', 'copy');
    args.push('-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4');
  }
  args.push('pipe:1');

  const ff = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  setCors(res);
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
  ff.stdout.pipe(res);
  ff.stderr.on('data', d => process.stderr.write('[ffmpeg] ' + d));
  const kill = () => { try { ff.kill('SIGKILL'); } catch (_) {} };
  req.on('close', kill);
  ff.on('error', () => { if (!res.writableEnded) res.end(); });
  ff.on('close', () => { if (!res.writableEnded) res.end(); });
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
    return sendJson(res, 200, { ok: true, engine: 'flippy-v4-mp4-muxer', ffmpeg: HAS_FFMPEG });
  }

  if (parsed.pathname === '/__flippy_yt_transcode') {
    return handleTranscode(parsed, req, res);
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
