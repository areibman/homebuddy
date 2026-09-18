import { sampleAssetUrl } from '../../server/catalog-paths.mjs';
import { homeDefinitions, type HomeDefinition, type Listing } from './home-definitions';

function rewriteListing(listing: Listing): Listing {
  return {
    ...listing,
    photos: listing.photos.map((photo) => ({ ...photo, src: sampleAssetUrl(photo.src) })),
    finishes: Object.fromEntries(Object.entries(listing.finishes).map(([name, finish]) => [name, { ...finish, src: sampleAssetUrl(finish.src) }])),
  };
}

export function materializeSample(id: string): HomeDefinition | undefined {
  const home = homeDefinitions[id];
  if (!home) return undefined;
  return {
    ...home,
    floorPlan: sampleAssetUrl(home.floorPlan),
    download: sampleAssetUrl(home.download),
    layoutDownloads: home.layoutDownloads && Object.fromEntries(Object.entries(home.layoutDownloads).map(([name, path]) => [name, sampleAssetUrl(path)])),
    panorama: home.panorama,
    listing: rewriteListing(home.listing),
  };
}

export function fromInterior(row: {
  ref: string;
  title: string;
  subtitle: string;
  beds: number;
  sqft: number;
  plan: HomeDefinition['plan'];
  listing: Listing;
  floorPlan: string;
  download: string;
  layoutDownloads?: Record<string, string>;
  location?: string;
  panorama?: string | null;
  error?: string;
  status: string;
}): HomeDefinition {
  return {
    id: row.ref,
    title: row.title,
    subtitle: row.subtitle,
    beds: row.beds,
    sqft: row.sqft,
    plan: row.plan,
    listing: row.listing,
    floorPlan: row.floorPlan,
    download: row.download,
    layoutDownloads: row.layoutDownloads,
    location: row.location,
    panorama: row.panorama,
  };
}
