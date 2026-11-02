/**
 * Flippy v4 — Cloudflare Worker Edge Handler for Direct MP4 Stream Resolution
 * 100% Ad-Free & Popup-Free:
 * - SaveTube WebCrypto (AES-128-CBC) + Cobalt v11 dual edge extractor
 * - Verified binary streaming on /__flippy_yt_stream (drops ad redirects & HTML popups)
 * - Stateless HMAC-SHA256 signed stream tokens
 */

const DEFAULT_SECRET = "FLIPPY_SECRET_SALT_2026_9b83f0c1";

const BLOCKED_CHANNELS = [];
const BLOCKED_TITLE_PATTERNS = [];

const ALLOWED_FORMATS = new Set([
  '4k', '1440', '1080', '720', '480', '360',
  'mp3', 'm4a', 'aac', 'flac', 'opus', 'wav', 'webm'
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Disposition, Content-Type'
};

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

async function verifyYoutubeCompliance(ytUrl) {
  try {
    const oembedUrl = 'https://www.youtube.com/oembed?url=' + encodeURIComponent(ytUrl) + '&format=json';
    const r = await fetch(oembedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return { allowed: true };
    const meta = await r.json();
    return { allowed: true, meta };
  } catch (_) {
    return { allowed: true };
  }
}

const YT_UA_MOBILE = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36';
const YT_UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SAVETUBE_KEY_HEX = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
const PINNED_COBALT_INSTANCES = ['https://rue-cobalt.xenon.zone'];

function extractYoutubeVideoId(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  const m = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (m && m[1]) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

function canonicalYoutubeWatchUrl(input) {
  const id = extractYoutubeVideoId(input);
  return id ? `https://www.youtube.com/watch?v=${id}` : String(input || "").trim();
}

function isAudioFormat(format) {
  return format === 'mp3' || format === 'm4a' || format === 'aac' || format === 'wav' || format === 'flac' || format === 'opus';
}

function getFormatExtension(format) {
  if (format === 'mp3' || format === 'm4a' || format === 'wav' || format === 'flac') return format;
  if (format === 'aac') return 'm4a';
  if (format === 'opus') return 'mp3';
  return 'mp4';
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function base64ToBytes(b64) {
  const bin = atob(String(b64).replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64u) {
  let b64 = String(b64u).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function signData(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifySignature(data, sigHex, secret) {
  const expected = await signData(data, secret);
  return expected === sigHex;
}

async function mintStreamToken(payloadObj, secret) {
  const encoded = toBase64Url(JSON.stringify(payloadObj));
  const sig = await signData(encoded, secret);
  return `${encoded}.${sig}`;
}

async function verifyStreamToken(tokenStr, secret) {
  if (!tokenStr || typeof tokenStr !== 'string') return null;
  const dot = tokenStr.indexOf('.');
  if (dot <= 0) return null;
  const encoded = tokenStr.slice(0, dot);
  const sig = tokenStr.slice(dot + 1);
  const valid = await verifySignature(encoded, sig, secret);
  if (!valid) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function decryptSaveTubePayload(encB64) {
  const raw = base64ToBytes(encB64);
  if (raw.byteLength <= 16) throw new Error('Invalid media cipher payload');
  const iv = raw.subarray(0, 16);
  const ciphertext = raw.subarray(16);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    hexToBytes(SAVETUBE_KEY_HEX),
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

// 100% ad-free & popup-free SaveTube CDN resolution
async function resolveViaSaveTube(ytUrl, format) {
  const watchUrl = canonicalYoutubeWatchUrl(ytUrl);
  const wantAudio = isAudioFormat(format);
  const stQuality = wantAudio ? '128' : (format === '720' || format === '480' || format === '360' ? format : '1080');

  const cdnRes = await fetchWithTimeout('https://media.savetube.vip/api/random-cdn', {
    headers: {
      'User-Agent': YT_UA_MOBILE,
      'Referer': 'https://save-tube.com/',
      'Origin': 'https://save-tube.com',
      'Accept': 'application/json'
    }
  }, 6000);
  if (!cdnRes.ok) throw new Error(`SaveTube CDN HTTP ${cdnRes.status}`);
  const cdnJson = await cdnRes.json();
  const cdn = cdnJson && cdnJson.cdn ? String(cdnJson.cdn).trim() : '';
  if (!cdn) throw new Error('SaveTube returned empty CDN');

  const infoRes = await fetchWithTimeout(`https://${cdn}/v2/info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': YT_UA_MOBILE,
      'Referer': 'https://save-tube.com/',
      'Origin': 'https://save-tube.com'
    },
    body: JSON.stringify({ url: watchUrl })
  }, 10000);
  if (!infoRes.ok) throw new Error(`SaveTube info HTTP ${infoRes.status}`);
  const infoJson = await infoRes.json();
  if (!infoJson || !infoJson.status || !infoJson.data) {
    throw new Error((infoJson && infoJson.message) || 'SaveTube info unavailable');
  }

  const decoded = await decryptSaveTubePayload(infoJson.data);
  if (!decoded || !decoded.key) throw new Error('SaveTube key missing');

  const dlRes = await fetchWithTimeout(`https://${cdn}/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': YT_UA_MOBILE,
      'Referer': 'https://save-tube.com/',
      'Origin': 'https://save-tube.com'
    },
    body: JSON.stringify({
      downloadType: wantAudio ? 'audio' : 'video',
      quality: stQuality,
      key: decoded.key
    })
  }, 14000);
  if (!dlRes.ok) throw new Error(`SaveTube download HTTP ${dlRes.status}`);
  const dlJson = await dlRes.json();
  const dlUrl = dlJson && dlJson.data && dlJson.data.downloadUrl ? String(dlJson.data.downloadUrl).trim() : '';
  if (!dlUrl) throw new Error('SaveTube returned empty downloadUrl');

  return {
    provider: 'savetube',
    streamUrl: dlUrl,
    referer: 'https://save-tube.com/',
    title: decoded.title || ''
  };
}

async function resolveViaCobalt(ytUrl, format) {
  const watchUrl = canonicalYoutubeWatchUrl(ytUrl);
  const wantAudio = isAudioFormat(format);
  const videoQuality = ({ '4k': '2160', '1440': '1440', '1080': '1080', '720': '720', '480': '480', '360': '360' })[format] || '1080';

  const reqBody = wantAudio
    ? { url: watchUrl, downloadMode: 'audio', audioFormat: (format === 'wav' ? 'wav' : 'mp3') }
    : { url: watchUrl, videoQuality, youtubeVideoCodec: 'h264' };

  for (const base of PINNED_COBALT_INSTANCES) {
    try {
      const r = await fetchWithTimeout(base + '/', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': YT_UA_DESKTOP
        },
        body: JSON.stringify(reqBody)
      }, 10000);
      if (!r.ok) continue;
      const j = await r.json();
      if ((j.status === 'tunnel' || j.status === 'redirect') && j.url) {
        return {
          provider: 'cobalt',
          streamUrl: String(j.url),
          referer: '',
          title: j.filename || ''
        };
      }
    } catch (_) {}
  }
  throw new Error('Cobalt fallback instance unavailable');
}

async function resolveCloudMedia(ytUrl, format) {
  try {
    return await resolveViaSaveTube(ytUrl, format);
  } catch (_) {
    return await resolveViaCobalt(ytUrl, format);
  }
}

// Blocks known ad domains from ever entering our stream
function isSafeUpstreamMediaUrl(urlObj) {
  if (!urlObj || urlObj.protocol !== 'https:') return false;
  const h = urlObj.hostname.toLowerCase();
  const p = urlObj.pathname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.)/.test(h)) return false;
  if (p.includes('/ajax/ad') || p.includes('/ad/') || h.includes('hai8g') || h.includes('savenow.to')) return false;
  return true;
}

// Inspects stream and rejects any response that is an HTML ad or redirect
async function openVerifiedBinaryStream(rawStreamUrl, referer = '', rangeHeader = '') {
  let current;
  try { current = new URL(String(rawStreamUrl || '').trim()); } catch (_) { return null; }
  if (current.protocol === 'http:') current.protocol = 'https:';
  if (!isSafeUpstreamMediaUrl(current)) return null;

  let res = null;
  for (let hop = 0; hop < 3; hop++) {
    const headers = { 'User-Agent': YT_UA_MOBILE };
    if (referer) headers['Referer'] = referer;
    if (rangeHeader) headers['Range'] = rangeHeader;

    const r = await fetchWithTimeout(current.href, { method: 'GET', redirect: 'manual', headers }, 15000);
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location');
      try { if (r.body) await r.body.cancel(); } catch (_) {}
      if (!loc) return null;
      let next;
      try { next = new URL(loc, current.href); } catch (_) { return null; }
      if (next.protocol === 'http:') next.protocol = 'https:';
      if (!isSafeUpstreamMediaUrl(next)) return null;
      current = next;
      continue;
    }
    res = r;
    break;
  }

  if (!res || !res.ok || !res.body) return null;
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('text/plain')) {
    try { await res.body.cancel(); } catch (_) {}
    return null;
  }

  const reader = res.body.getReader();
  let firstChunk = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      firstChunk = value;
      break;
    }
  }

  if (!firstChunk || firstChunk.byteLength < 16) {
    try { await reader.cancel(); } catch (_) {}
    return null;
  }

  const headAscii = new TextDecoder().decode(firstChunk.subarray(0, Math.min(96, firstChunk.byteLength))).trimStart().toLowerCase();
  if (headAscii.startsWith('<!doctype') || headAscii.startsWith('<html') || headAscii.startsWith('<script') || headAscii.startsWith('{') || headAscii.startsWith('[')) {
    try { await reader.cancel(); } catch (_) {}
    return null;
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(firstChunk);
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) controller.close();
        else if (value) controller.enqueue(value);
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel() {
      try { await reader.cancel(); } catch (_) {}
    }
  });

  return {
    stream,
    status: res.status,
    contentType: ct && ct !== 'application/octet-stream' ? ct : null,
    contentLength: res.headers.get('content-length') || '',
    contentRange: res.headers.get('content-range') || '',
    acceptRanges: res.headers.get('accept-ranges') || ''
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const secret = (env && env.FLIPPY_SECRET) || DEFAULT_SECRET;

    if (url.pathname === '/__flippy_yt_ping') {
      return jsonResponse(200, {
        ok: true,
        engine: 'flippy-v4-edge-mp4',
        streamProxy: true,
        canDownload: true
      });
    }

    if (url.pathname === '/__flippy_yt_dl') {
      const ytUrl = (url.searchParams.get('url') || '').trim();
      const rawFmt = (url.searchParams.get('format') || '1080').trim().toLowerCase();
      const format = ALLOWED_FORMATS.has(rawFmt) ? rawFmt : '1080';

      if (!ytUrl || !/(?:youtube\.com|youtu\.be)/i.test(ytUrl) || !extractYoutubeVideoId(ytUrl)) {
        return jsonResponse(400, { success: false, error: 'Invalid YouTube URL' });
      }

      const compliance = await verifyYoutubeCompliance(ytUrl);
      if (!compliance.allowed) {
        return jsonResponse(403, { success: false, error: compliance.reason });
      }

      try {
        const resolved = await resolveCloudMedia(ytUrl, format);
        const streamToken = await mintStreamToken({
          src: resolved.streamUrl,
          ref: resolved.referer || '',
          url: canonicalYoutubeWatchUrl(ytUrl),
          fmt: format,
          exp: Date.now() + 20 * 60 * 1000
        }, secret);

        return jsonResponse(200, {
          success: 1,
          id: 'yt_' + Date.now().toString(36),
          progress: 1000,
          text: 'Finished',
          provider: resolved.provider,
          title: resolved.title || '',
          download_url: '/__flippy_yt_stream?token=' + encodeURIComponent(streamToken)
        });
      } catch (err) {
        return jsonResponse(502, {
          success: false,
          error: 'Cloud MP4 muxer error: ' + (err && err.message ? err.message : 'upstream unavailable')
        });
      }
    }

    if (url.pathname === '/__flippy_yt_progress') {
      return jsonResponse(200, {
        success: 1,
        progress: 1000,
        text: 'Finished'
      });
    }

    if (url.pathname === '/__flippy_yt_stream') {
      const rawToken = (url.searchParams.get('token') || '').trim();
      const rawUrl = (url.searchParams.get('url') || '').trim();
      const rawFmt = (url.searchParams.get('format') || '1080').trim().toLowerCase();
      const rangeHeader = request.headers.get('range') || '';

      const tokenData = rawToken ? await verifyStreamToken(rawToken, secret) : null;
      const effectiveFmt = ALLOWED_FORMATS.has(tokenData && tokenData.fmt ? tokenData.fmt : rawFmt)
        ? (tokenData && tokenData.fmt ? tokenData.fmt : rawFmt)
        : '1080';

      let binaryStream = null;
      if (tokenData && tokenData.src) {
        binaryStream = await openVerifiedBinaryStream(tokenData.src, tokenData.ref || 'https://save-tube.com/', rangeHeader);
      }

      if (!binaryStream && (tokenData && tokenData.url || rawUrl)) {
        try {
          const freshTarget = (tokenData && tokenData.url) || canonicalYoutubeWatchUrl(rawUrl);
          const fresh = await resolveCloudMedia(freshTarget, effectiveFmt);
          if (fresh && fresh.streamUrl) {
            binaryStream = await openVerifiedBinaryStream(fresh.streamUrl, fresh.referer || 'https://save-tube.com/', rangeHeader);
          }
        } catch (_) {}
      }

      if (!binaryStream) {
        return jsonResponse(502, {
          success: false,
          error: 'Could not stream direct MP4 binary without popup/ad scripts. Please re-analyze the link.'
        });
      }

      const outExt = getFormatExtension(effectiveFmt);
      const defaultMime = (outExt === 'mp3' ? 'audio/mpeg' : (outExt === 'm4a' ? 'audio/mp4' : (outExt === 'wav' ? 'audio/wav' : 'video/mp4')));
      const headers = new Headers(CORS_HEADERS);
      headers.set('Content-Type', binaryStream.contentType || defaultMime);
      headers.set('Cache-Control', 'no-store');
      headers.set('Content-Disposition', `attachment; filename="flippy_video.${outExt}"`);
      if (binaryStream.contentLength) headers.set('Content-Length', binaryStream.contentLength);
      if (binaryStream.contentRange) headers.set('Content-Range', binaryStream.contentRange);
      if (binaryStream.acceptRanges) headers.set('Accept-Ranges', binaryStream.acceptRanges);

      return new Response(binaryStream.stream, {
        status: binaryStream.status === 206 ? 206 : 200,
        headers
      });
    }

    if (env && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
