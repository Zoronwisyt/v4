/**
 * Flippy v4 — Cloudflare Worker Edge Handler for Direct MP4 Stream Resolution
 * Provides /__flippy_yt_ping, /__flippy_yt_dl, and /__flippy_yt_progress
 * alongside static asset delivery so mobile/iPhone users receive real .MP4 files.
 */

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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept'
};

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
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
    return { allowed: true };
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
      const r = await fetch(`${host}${pathname}?${qs}`, {
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
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Upstream MP4 muxer unavailable');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/__flippy_yt_ping') {
      return jsonResponse(200, { ok: true, engine: 'flippy-v4-edge-mp4' });
    }

    if (url.pathname === '/__flippy_yt_dl') {
      const ytUrl = (url.searchParams.get('url') || '').trim();
      const rawFmt = (url.searchParams.get('format') || '1080').trim().toLowerCase();
      const format = ALLOWED_FORMATS.has(rawFmt) ? rawFmt : '1080';

      if (!ytUrl || !/(?:youtube\.com|youtu\.be)/i.test(ytUrl)) {
        return jsonResponse(400, { success: false, error: 'Invalid YouTube URL' });
      }

      const compliance = await verifyYoutubeCompliance(ytUrl);
      if (!compliance.allowed) {
        return jsonResponse(403, { success: false, error: compliance.reason });
      }

      try {
        const data = await fetchUpstreamJson('/api/v2/download', {
          button: '1',
          format,
          iframe_source: url.origin + '/',
          url: ytUrl
        });
        return jsonResponse(200, data);
      } catch (err) {
        return jsonResponse(502, { success: false, error: err.message || 'Upstream muxer failed' });
      }
    }

    if (url.pathname === '/__flippy_yt_progress') {
      const id = (url.searchParams.get('id') || '').trim();
      if (!id) {
        return jsonResponse(400, { success: false, error: 'Missing conversion job id' });
      }
      try {
        const data = await fetchUpstreamJson('/api/progress', { id });
        return jsonResponse(200, data);
      } catch (err) {
        return jsonResponse(502, { success: false, error: err.message || 'Progress poll failed' });
      }
    }

    if (env && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
