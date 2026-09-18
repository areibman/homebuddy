/** Stable public keys for catalog binaries. The `v=` hash in catalog.json is the cache key. */
export function catalogAssetKey(id, legacyPath) {
  if (typeof legacyPath !== 'string' || !legacyPath) return '';
  const [path, query = ''] = legacyPath.split('?');
  const hash = new URLSearchParams(query).get('v') || '0';
  const ext = path.slice(path.lastIndexOf('.')) || '';
  return `catalog/${id}/${hash}${ext}`;
}

export function catalogAssetUrl(id, legacyPath) {
  const key = catalogAssetKey(id, legacyPath);
  return key ? `/api/assets/${key}` : '';
}

/** Listing photos, floor plans, and downloads that used to live in public/. */
export function sampleAssetKey(legacyPath) {
  const path = String(legacyPath || '').split('?')[0].replace(/^\//, '');
  return path ? `samples/${path}` : '';
}

export function sampleAssetUrl(legacyPath) {
  if (!legacyPath || legacyPath.startsWith('http') || legacyPath.startsWith('/api/assets/')) return legacyPath;
  const key = sampleAssetKey(legacyPath);
  return key ? `/api/assets/${key}` : legacyPath;
}

export const STUDIO_HDR = '/api/assets/catalog/environments/catalog-studio-final.hdr';
export const CITY_PANORAMA = '/api/assets/catalog/environments/san-francisco-city-panorama.png';
