import {randomUUID} from 'node:crypto';
import {extname} from 'node:path';
import {spawn} from 'node:child_process';
import {createAssetStore} from '../server/asset-store.mjs';

function convex(fn, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['convex', 'run', fn, ...(args ? [JSON.stringify(args)] : [])], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.on('exit', (code) => code === 0 ? resolve(out) : reject(new Error(`${fn} exited ${code}`)));
  });
}

let pending;
try { pending = JSON.parse(await convex('migrate:pending')); }
catch { console.log('No Convex deployment to migrate, or there is nothing in Convex file storage.'); process.exit(0); }
const files = pending.files || [];
const furniture = pending.furniture || [];
if (!files.length && !furniture.length) { console.log('No Convex storage files to copy.'); process.exit(0); }
const store = createAssetStore();
async function copy(url, userId, name) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read a stored file (${response.status}).`);
  const key = `homes/${userId}/migrated/${randomUUID()}${extname(name).toLowerCase() || '.bin'}`;
  await store.put(key, Buffer.from(await response.arrayBuffer()), response.headers.get('content-type') || 'application/octet-stream');
  return key;
}
for (const file of files) {
  if (!file.url) continue;
  const assetKey = await copy(file.url, file.userId, file.fileName);
  await convex('migrate:attachFile', { id: file.id, assetKey });
}
for (const row of furniture) {
  if (!row.glbUrl) continue;
  const glbKey = await copy(row.glbUrl, row.userId, `${row.name}.glb`);
  const previewKey = row.previewUrl ? await copy(row.previewUrl, row.userId, `${row.name}.png`) : undefined;
  await convex('migrate:attachFurniture', { id: row.id, glbKey, ...(previewKey ? { previewKey } : {}) });
}
console.log(`Copied ${files.length} home files and ${furniture.length} custom models out of Convex storage.`);
