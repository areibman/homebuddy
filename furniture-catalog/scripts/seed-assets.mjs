import {readFile,readdir,stat} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {spawn} from 'node:child_process';
import {createAssetStore} from '../server/asset-store.mjs';
import {catalogAssetKey,sampleAssetKey} from '../server/catalog-paths.mjs';

const store = createAssetStore();
const catalog = JSON.parse(await readFile('app/catalog.json', 'utf8'));

async function exists(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

async function copyTree(from, prefix) {
  let count = 0;
  async function walk(dir) {
    for (const name of await readdir(dir)) {
      const path = join(dir, name);
      const info = await stat(path);
      if (info.isDirectory()) await walk(path);
      else {
        const key = `${prefix}/${relative(from, path).split('\\').join('/')}`;
        await store.put(key, await readFile(path));
        count++;
      }
    }
  }
  if (await stat(from).then((info) => info.isDirectory()).catch(() => false)) await walk(from);
  return count;
}

let copied = 0;
for (const item of catalog) {
  for (const legacy of Object.values(item.files)) {
    const source = join('public', String(legacy).split('?')[0].slice(1));
    if (!await exists(source)) continue;
    await store.put(catalogAssetKey(item.id, legacy), await readFile(source));
    copied++;
  }
}
const trees = await Promise.all([
  copyTree('public/listings', 'samples/listings'),
  copyTree('public/plans', 'samples/plans'),
  copyTree('public/city-plans', 'samples/city-plans'),
  copyTree('public/environments', 'catalog/environments'),
]);
console.log(`Stored ${copied} catalog files and ${trees.reduce((sum, n) => sum + n, 0)} sample files in ${store.mode} (${store.root}).`);

function rewriteListing(listing) {
  const next = structuredClone(listing);
  for (const photo of next.photos || []) photo.src = `/api/assets/${sampleAssetKey(photo.src)}`;
  for (const finish of Object.values(next.finishes || {})) finish.src = `/api/assets/${sampleAssetKey(finish.src)}`;
  return next;
}

const samples = [
  { slug: '13', title: 'Spera', subtitle: 'Plan E', beds: 1, sqft: 503, plan: 'app/decorate/plan.json', listing: 'app/decorate/listing.json', floorPlan: '/plans/spera-plan-e.jpg', download: '/plans/spera-furnished.blend' },
  { slug: '15', title: '333 Bush Street', subtitle: '#4101', beds: 2, sqft: 1250, plan: 'app/decorate/homes/bush-4101/plan.json', listing: 'app/decorate/homes/bush-4101/listing.json', floorPlan: '/city-plans/333-bush-street-unit-4101-1.jpg', download: '/plans/bush-4101-gather.blend', layoutDownloads: { gather: '/plans/bush-4101-gather.blend', retreat: '/plans/bush-4101-retreat.blend' }, location: 'San Francisco' },
  { slug: 'flowhouse-wb1', title: 'Flow House', subtitle: 'WB1 · Balcony', beds: 2, sqft: 970, plan: 'app/decorate/homes/flowhouse-wb1/plan.json', listing: 'app/decorate/homes/flowhouse-wb1/listing.json', floorPlan: '/listings/flowhouse-wb1/floor-plan.png', download: '/plans/flowhouse-wb1-gather.blend', layoutDownloads: { gather: '/plans/flowhouse-wb1-gather.blend', retreat: '/plans/flowhouse-wb1-retreat.blend' }, location: 'Imported floor plan', panoramaKey: '' },
];

const payload = {
  items: catalog.map((item) => ({
    slug: item.id,
    name: item.name,
    category: item.category,
    description: item.description,
    materials: item.materials,
    widthM: item.dimensions_m.width,
    depthM: item.dimensions_m.depth,
    heightM: item.dimensions_m.height,
    provenance: item.provenance,
    ...(item.dimensions_note ? { dimensionsNote: item.dimensions_note } : {}),
    retailer: item.source.retailer,
    sourceUrl: item.source.url,
    photoUrl: item.source.photo_url,
    articleNumber: item.source.article_number,
    checkedDate: item.source.checked_date,
    glbKey: catalogAssetKey(item.id, item.files.glb),
    previewKey: catalogAssetKey(item.id, item.files.preview),
    ...(item.files.blend ? { blendKey: catalogAssetKey(item.id, item.files.blend) } : {}),
    ...(item.viewer?.orbit ? { viewerOrbit: item.viewer.orbit } : {}),
  })),
  interiors: await Promise.all(samples.map(async (sample) => ({
    slug: sample.slug,
    title: sample.title,
    subtitle: sample.subtitle,
    beds: sample.beds,
    sqft: sample.sqft,
    planJson: await readFile(sample.plan, 'utf8'),
    listingJson: JSON.stringify(rewriteListing(JSON.parse(await readFile(sample.listing, 'utf8')))),
    floorPlanKey: sampleAssetKey(sample.floorPlan),
    downloadKey: sampleAssetKey(sample.download),
    ...(sample.layoutDownloads ? { layoutDownloadsJson: JSON.stringify(Object.fromEntries(Object.entries(sample.layoutDownloads).map(([id, path]) => [id, sampleAssetKey(path)]))) } : {}),
    ...(sample.location ? { location: sample.location } : {}),
    ...(sample.panoramaKey !== undefined ? { panoramaKey: sample.panoramaKey } : {}),
  }))),
};

const child = spawn('npx', ['convex', 'run', 'seed:apply', JSON.stringify(payload)], { stdio: ['ignore', 'inherit', 'inherit'] });
const code = await new Promise((resolve) => {
  const timer = setTimeout(() => { child.kill(); resolve(1); }, 25000);
  child.on('exit', (status) => { clearTimeout(timer); resolve(status ?? 1); });
});
if (code !== 0) console.log('Convex seed did not run. Catalog files are in the asset store; run `npx convex dev` and then `npm run seed` again to publish records.');
else console.log('Seeded Convex catalog and sample interiors.');
