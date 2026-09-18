import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function envValue(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const quote = trimmed[0];
    const end = trimmed.indexOf(quote, 1);
    return end === -1 ? trimmed.slice(1) : trimmed.slice(1, end);
  }
  return trimmed.replace(/\s+#.*$/, '').trim();
}

/** Scripts and the generation process do not get Next's automatic env loading. */
function loadLocalEnv() {
  const fileVars = {};
  for (const name of ['.env', '.env.local']) {
    const path = resolve(packageRoot, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const eq = trimmed.indexOf('=');
      const key = trimmed.slice(0, eq).trim();
      if (key) fileVars[key] = envValue(trimmed.slice(eq + 1));
    }
  }
  for (const [key, value] of Object.entries(fileVars)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  // Keep the file's key and secret together. An inherited secret without a matching
  // access key belongs to a different identity and would fail every signed request.
  if (fileVars.AWS_ACCESS_KEY_ID && fileVars.AWS_SECRET_ACCESS_KEY) {
    const id = process.env.AWS_ACCESS_KEY_ID;
    if (!id || id === fileVars.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      process.env.AWS_ACCESS_KEY_ID = fileVars.AWS_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = fileVars.AWS_SECRET_ACCESS_KEY;
    }
  }
}

loadLocalEnv();

const PUBLIC = ['catalog/', 'samples/'];
const EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export function assertAssetKey(key) {
  if (typeof key !== 'string' || key.length > 240 || key.split('/').includes('..') || !/^(catalog|samples|homes)\/[A-Za-z0-9._/-]+$/.test(key)) {
    throw Object.assign(new Error('Invalid asset key.'), { status: 400 });
  }
  return key;
}

export function isPublicAsset(key) {
  return PUBLIC.some((prefix) => key.startsWith(prefix));
}

export function contentTypeFor(key) {
  return {
    '.glb': 'model/gltf-binary',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.hdr': 'image/vnd.radiance',
    '.blend': 'application/octet-stream',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
  }[extname(key).toLowerCase()] || 'application/octet-stream';
}

function hmac(secret, message) {
  return createHmac('sha256', secret).update(message).digest('base64url');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function signingKey(secret, date, region, service) {
  const kDate = createHmac('sha256', `AWS4${secret}`).update(date).digest();
  const kRegion = createHmac('sha256', kDate).update(region).digest();
  const kService = createHmac('sha256', kRegion).update(service).digest();
  return createHmac('sha256', kService).update('aws4_request').digest();
}

async function s3Request({ region, accessKeyId, secretAccessKey, bucket, method, key, body, contentType }) {
  const host = `s3.${region}.amazonaws.com`;
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  const url = `https://${host}/${bucket}/${encoded}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const payload = body ? (Buffer.isBuffer(body) ? body : Buffer.from(body)) : Buffer.alloc(0);
  const payloadHash = body ? sha256(payload) : EMPTY_HASH;
  const headers = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType && method !== 'GET' && method !== 'DELETE') headers['content-type'] = contentType;
  const signedHeaderNames = Object.keys(headers).sort();
  const canonical = [
    method,
    `/${bucket}/${encoded}`,
    '',
    signedHeaderNames.map((name) => `${name}:${headers[name]}`).join('\n') + '\n',
    signedHeaderNames.join(';'),
    payloadHash,
  ].join('\n');
  const scope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonical)}`;
  const signature = createHmac('sha256', signingKey(secretAccessKey, date, region, 's3')).update(stringToSign).digest('hex');
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaderNames.join(';')}, Signature=${signature}`;
  const response = await fetch(url, { method, headers, body: method === 'GET' || method === 'DELETE' ? undefined : payload });
  if (response.status === 404) return response;
  if (!response.ok) throw new Error(`Asset store ${method} failed (${response.status}).`);
  return response;
}

export function createAssetStore(options = {}) {
  const mode = options.mode || process.env.ASSET_STORE || 'local';
  const root = resolve(options.root || process.env.ASSET_STORE_DIR || resolve(dirname(fileURLToPath(import.meta.url)), '../.asset-store'));
  const secret = options.secret || process.env.ASSET_SIGNING_SECRET || 'homebuddy-dev-asset-signing';
  const s3 = {
    region: options.region || process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
    accessKeyId: options.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: options.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '',
    bucket: options.bucket || process.env.S3_BUCKET || '',
  };
  if (mode === 's3' && (!s3.accessKeyId || !s3.secretAccessKey || !s3.bucket)) {
    throw new Error('ASSET_STORE=s3 requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET.');
  }

  function objectUrl(key) {
    const encoded = key.split('/').map(encodeURIComponent).join('/');
    return `https://s3.${s3.region}.amazonaws.com/${s3.bucket}/${encoded}`;
  }

  function presign(method, key, { contentType, ttlSeconds, stable = false }) {
    const host = `s3.${s3.region}.amazonaws.com`;
    const encoded = key.split('/').map(encodeURIComponent).join('/');
    const canonicalUri = `/${s3.bucket}/${encoded}`;
    // Public catalog URLs stay the same for an hour so the browser can cache the download.
    const now = stable ? new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000) : new Date();
    if (stable) ttlSeconds = Math.max(ttlSeconds, 7_200);
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = amzDate.slice(0, 8);
    const signedHeaders = contentType ? 'content-type;host' : 'host';
    const query = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${s3.accessKeyId}/${date}/${s3.region}/s3/aws4_request`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(ttlSeconds),
      'X-Amz-SignedHeaders': signedHeaders,
    };
    const canonicalQuery = Object.keys(query).sort().map((name) => `${encodeRfc3986(name)}=${encodeRfc3986(query[name])}`).join('&');
    const canonicalHeaders = contentType ? `content-type:${contentType}\nhost:${host}\n` : `host:${host}\n`;
    const canonical = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');
    const scope = `${date}/${s3.region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonical)}`;
    const signature = createHmac('sha256', signingKey(s3.secretAccessKey, date, s3.region, 's3')).update(stringToSign).digest('hex');
    return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  async function put(key, body, contentType = contentTypeFor(key)) {
    assertAssetKey(key);
    const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
    if (mode === 's3') {
      await s3Request({ ...s3, method: 'PUT', key, body: bytes, contentType });
    } else {
      const path = resolve(root, key);
      if (!path.startsWith(root)) throw new Error('Invalid asset key.');
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
    }
    return { key, size: bytes.length, contentType };
  }

  async function readLocal(key) {
    assertAssetKey(key);
    const path = resolve(root, key);
    if (path !== root && !path.startsWith(`${root}/`)) return null;
    try {
      const info = await stat(path);
      if (!info.isFile()) return null;
      return { body: await readFile(path), contentType: contentTypeFor(key), size: info.size };
    } catch {
      return null;
    }
  }

  async function get(key) {
    assertAssetKey(key);
    if (mode === 's3') {
      const response = await s3Request({ ...s3, method: 'GET', key });
      if (response.status === 404) return null;
      return { body: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get('content-type') || contentTypeFor(key), size: Number(response.headers.get('content-length') || 0) };
    }
    const path = resolve(root, key);
    if (!path.startsWith(root)) return null;
    try {
      const info = await stat(path);
      if (!info.isFile()) return null;
      return { body: await readFile(path), contentType: contentTypeFor(key), size: info.size };
    } catch {
      return null;
    }
  }

  async function remove(key) {
    assertAssetKey(key);
    if (mode === 's3') {
      await s3Request({ ...s3, method: 'DELETE', key });
      return;
    }
    const path = resolve(root, key);
    if (path.startsWith(root)) await rm(path, { force: true });
  }

  function publicUrl(key) {
    assertAssetKey(key);
    if (!isPublicAsset(key)) throw new Error('That asset is not public.');
    return mode === 's3' ? objectUrl(key) : `/api/assets/${key}`;
  }

  function signedGet(key, ttlSeconds = 600) {
    assertAssetKey(key);
    return mode === 's3' ? presign('GET', key, { ttlSeconds, stable: isPublicAsset(key) }) : sign(key, ttlSeconds);
  }

  function uploadUrl(key, contentType, ttlSeconds = 600) {
    assertAssetKey(key);
    if (mode !== 's3') return null;
    return presign('PUT', key, { contentType, ttlSeconds });
  }

  function sign(key, ttlSeconds = 600) {
    assertAssetKey(key);
    const exp = Date.now() + ttlSeconds * 1000;
    const sig = hmac(secret, `${key}\n${exp}`);
    return `/api/assets/${key}?exp=${exp}&sig=${sig}`;
  }

  function verify(key, exp, sig) {
    try { assertAssetKey(key); } catch { return false; }
    if (!exp || !sig || Number(exp) < Date.now()) return false;
    const expected = hmac(secret, `${key}\n${exp}`);
    const left = Buffer.from(expected);
    const right = Buffer.from(String(sig));
    return left.length === right.length && timingSafeEqual(left, right);
  }

  function userKey(userId, filename) {
    const ext = extname(filename || '').toLowerCase().replace(/[^.a-z0-9]/g, '') || '.bin';
    return assertAssetKey(`homes/${userId}/${randomUUID()}${ext}`);
  }

  return { mode, root, put, get, readLocal, remove, publicUrl, sign, signedGet, uploadUrl, verify, userKey };
}

export const assetStore = createAssetStore();
