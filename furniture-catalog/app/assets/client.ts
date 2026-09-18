export async function uploadAsset(token: string, file: File, kind: 'glb' | 'preview' | 'floor_plan' | 'photo' | 'reference') {
  const contentType = file.type || 'application/octet-stream';
  const ticket = await fetch('/api/assets/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, fileName: file.name, contentType, size: file.size }),
  });
  const issued = await ticket.json() as { key?: string; uploadUrl?: string; contentType?: string; direct?: boolean; error?: string };
  if (!ticket.ok) throw new Error(issued.error || 'The upload did not finish.');
  if (issued.uploadUrl && issued.key) {
    const uploaded = await fetch(issued.uploadUrl, { method: 'PUT', headers: { 'Content-Type': issued.contentType || contentType }, body: file });
    if (!uploaded.ok) throw new Error('The upload did not finish.');
    return { key: issued.key, size: file.size, contentType: issued.contentType || contentType };
  }
  const body = new FormData();
  body.set('file', file);
  body.set('kind', kind);
  const response = await fetch('/api/assets/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  const data = await response.json() as { key?: string; size?: number; contentType?: string; error?: string };
  if (!response.ok || !data.key) throw new Error(data.error || 'The upload did not finish.');
  return { key: data.key, size: data.size ?? file.size, contentType: data.contentType || file.type };
}

export async function signedUrls(token: string, keys: string[]) {
  const needed = keys.filter((key) => key.startsWith('homes/'));
  if (!needed.length) return {} as Record<string, string>;
  const response = await fetch('/api/assets/sign', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ keys: needed }) });
  const data = await response.json() as { urls?: Record<string, string>; error?: string };
  if (!response.ok) throw new Error(data.error || 'Could not open that file.');
  return data.urls ?? {};
}

export async function deleteAssets(token: string, keys: string[]) {
  const owned = keys.filter((key) => key.startsWith('homes/'));
  await Promise.all(owned.map((key) => fetch(`/api/assets/${key}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined)));
}
