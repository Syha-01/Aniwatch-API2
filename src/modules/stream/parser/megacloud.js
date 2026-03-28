import crypto from 'crypto';
import config from '@/config/config.js';

const { baseurl } = config;

/* =======================
   CONSTANTS
======================= */
const MAX_RETRIES = 2;
const TIMEOUT = 15000;

const MEGACLOUD_SCRIPT = 'https://megacloud.tv/js/player/a/prod/e1-player.min.js?v=';
const MEGACLOUD_SOURCES = 'https://megacloud.tv/embed-2/ajax/e-1/getSources?id=';

const MEGAPLAY = 'https://megaplay.buzz/stream/s-2/';
const VIDWISH = 'https://vidwish.live/stream/s-2/';

const FALLBACK_PROVIDERS = [
  { name: 'megaplay', domain: 'megaplay.buzz' },
  { name: 'vidwish', domain: 'vidwish.live' },
];

/* =======================
   FETCH HELPERS
======================= */
const fetchJSON = async (url, { headers = {}, timeout = TIMEOUT } = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } finally {
    clearTimeout(id);
  }
};

const fetchText = async (url, { headers = {}, timeout = TIMEOUT } = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.text();
  } finally {
    clearTimeout(id);
  }
};

/* =======================
   PUBLIC API
======================= */
export default async function megacloud({ selectedServer, id }, retry = 0) {
  try {
    // 1. Get the embed link from the ajax sources endpoint
    const sourcesResponse = await fetchAjaxSources(selectedServer.id);
    const embedLink = sourcesResponse.link;

    // Extract the video hash from the embed link (works with megacloud.blog, megacloud.tv, etc.)
    const videoId = embedLink.split('/').pop()?.split('?')[0];
    if (!videoId) throw new Error('Could not extract video ID from embed link');

    // 2. Get the sources from the megacloud getSources endpoint
    const srcsData = await fetchJSON(MEGACLOUD_SOURCES + videoId, {
      headers: {
        Accept: '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': config.headers['User-Agent'],
        Referer: `https://megacloud.tv/embed-2/e-1/${videoId}?k=1`,
      },
    });

    if (!srcsData) throw new Error('No sources data returned');

    const encryptedString = srcsData.sources;

    // 3. If sources are not encrypted, return them directly
    if (!srcsData.encrypted && Array.isArray(encryptedString)) {
      return buildResult({
        id,
        server: selectedServer,
        file: encryptedString[0]?.file,
        rawData: srcsData,
        usedFallback: false,
      });
    }

    // 4. Sources are encrypted - fetch the player script and extract variables
    const scriptText = await fetchText(MEGACLOUD_SCRIPT + Date.now().toString());
    if (!scriptText) throw new Error("Couldn't fetch player script");

    const vars = extractVariables(scriptText);
    if (!vars.length) throw new Error("Can't find variables in player script");

    // 5. Use variables to separate secret from encrypted source
    const { secret, encryptedSource } = getSecret(encryptedString, vars);

    // 6. Decrypt using AES-256-CBC with OpenSSL key derivation
    const decrypted = decrypt(encryptedSource, secret);
    const sources = JSON.parse(decrypted);

    if (!sources?.[0]?.file) throw new Error('No file in decrypted sources');

    return buildResult({
      id,
      server: selectedServer,
      file: sources[0].file,
      rawData: srcsData,
      usedFallback: false,
    });
  } catch (err) {
    console.error(`megacloud attempt ${retry + 1}:`, err.message);

    if (retry < MAX_RETRIES) {
      await backoff(retry);
      return megacloud({ selectedServer, id }, retry + 1);
    }

    // Try fallback providers as last resort
    try {
      const epID = id.split('ep=').pop();
      const { sources, rawData } = await getFallbackSource(
        epID,
        selectedServer.type,
        selectedServer.name
      );
      if (sources?.[0]?.file) {
        return buildResult({
          id,
          server: selectedServer,
          file: sources[0].file,
          rawData,
          usedFallback: true,
        });
      }
    } catch {
      // fallback also failed
    }

    return null;
  }
}

/* =======================
   VARIABLE EXTRACTION
   (from player script)
======================= */

function extractVariables(text) {
  const regex =
    /case\s*0x[0-9a-f]+:(?![^;]*=partKey)\s*\w+\s*=\s*(\w+)\s*,\s*\w+\s*=\s*(\w+);/g;
  const matches = text.matchAll(regex);
  const vars = Array.from(matches, (match) => {
    const matchKey1 = matchingKey(match[1], text);
    const matchKey2 = matchingKey(match[2], text);
    try {
      return [parseInt(matchKey1, 16), parseInt(matchKey2, 16)];
    } catch (e) {
      return [];
    }
  }).filter((pair) => pair.length > 0);

  return vars;
}

function matchingKey(value, script) {
  const regex = new RegExp(`,${value}=((?:0x)?([0-9a-fA-F]+))`);
  const match = script.match(regex);
  if (match) {
    return match[1].replace(/^0x/, '');
  } else {
    throw new Error('Failed to match the key');
  }
}

/* =======================
   SECRET EXTRACTION
======================= */

function getSecret(encryptedString, values) {
  let secret = '',
    encryptedSource = '',
    encryptedSourceArray = encryptedString.split(''),
    currentIndex = 0;

  for (const index of values) {
    const start = index[0] + currentIndex;
    const end = start + index[1];

    for (let i = start; i < end; i++) {
      secret += encryptedString[i];
      encryptedSourceArray[i] = '';
    }
    currentIndex += index[1];
  }

  encryptedSource = encryptedSourceArray.join('');

  return { secret, encryptedSource };
}

/* =======================
   AES DECRYPTION
   (OpenSSL-compatible)
======================= */

function decrypt(encrypted, keyOrSecret, maybe_iv) {
  let key;
  let iv;
  let contents;

  if (maybe_iv) {
    key = keyOrSecret;
    iv = maybe_iv;
    contents = encrypted;
  } else {
    const cypher = Buffer.from(encrypted, 'base64');
    const salt = cypher.subarray(8, 16);
    const password = Buffer.concat([Buffer.from(keyOrSecret, 'binary'), salt]);

    const md5Hashes = [];
    let digest = password;
    for (let i = 0; i < 3; i++) {
      md5Hashes[i] = crypto.createHash('md5').update(digest).digest();
      digest = Buffer.concat([md5Hashes[i], password]);
    }
    key = Buffer.concat([md5Hashes[0], md5Hashes[1]]);
    iv = md5Hashes[2];
    contents = cypher.subarray(16);
  }

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted =
    decipher.update(contents, typeof contents === 'string' ? 'base64' : undefined, 'utf8') +
    decipher.final();

  return decrypted;
}

/* =======================
   CORE HELPERS
======================= */

const fetchAjaxSources = async (serverId) => {
  const data = await fetchJSON(`${baseurl}/ajax/v2/episode/sources?id=${serverId}`);

  if (!data?.link) throw new Error('Missing ajax link');
  return data;
};

/* =======================
   FALLBACK
======================= */

const getFallbackSource = async (epID, type, serverName) => {
  const providers = prioritizeFallback(serverName);

  for (const provider of providers) {
    try {
      const html = await fetchFallbackHTML(provider, epID, type);
      const realId = extractDataId(html);
      if (!realId) continue;

      const { data } = await fetchFallbackSources(provider, realId);
      if (data?.sources?.file) {
        return {
          sources: [{ file: data.sources.file }],
          rawData: data,
        };
      }
    } catch {
      continue;
    }
  }

  throw new Error('All fallbacks failed');
};

const prioritizeFallback = (serverName) => {
  const name = serverName.toLowerCase();
  const primary =
    name === 'hd-1' || name === 'vidsrc' ? FALLBACK_PROVIDERS[0] : FALLBACK_PROVIDERS[1];

  return [primary, ...FALLBACK_PROVIDERS.filter((p) => p !== primary)];
};

const fetchFallbackHTML = async (provider, epID, type) =>
  fetchText(`https://${provider.domain}/stream/s-2/${epID}/${type}`, {
    headers: {
      Referer: `https://${provider.domain}/`,
      'User-Agent': config.headers['User-Agent'],
    },
  });

const fetchFallbackSources = async (provider, id) => {
  const data = await fetchJSON(`https://${provider.domain}/stream/getSources?id=${id}`, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `https://${provider.domain}/`,
    },
  });

  return { data };
};

const extractDataId = (html) => html.match(/data-id=["'](\d+)["']/)?.[1];

/* =======================
   UTIL
======================= */

const buildResult = ({ id, server, file, rawData, usedFallback }) => ({
  id,
  type: server.type,
  link: {
    file,
    type: 'hls',
  },
  tracks: rawData?.tracks ?? [],
  intro: rawData?.intro ?? null,
  outro: rawData?.outro ?? null,
  server: server.name,
  usedFallback,
});

const backoff = (retry) => new Promise((res) => setTimeout(res, 2000 * (retry + 1)));
