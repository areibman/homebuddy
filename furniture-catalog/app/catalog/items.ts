import rawCatalog from '../catalog.json';
import { catalogAssetUrl, sampleAssetUrl, STUDIO_HDR, CITY_PANORAMA } from '../../server/catalog-paths.mjs';

export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  materials: string[];
  dimensions_m: { width: number; depth: number; height: number };
  dimensions_note?: string;
  source: { retailer: string; url: string; photo_url: string; article_number: string; checked_date: string };
  files: { preview: string; glb: string; blend?: string };
  provenance: string;
  viewer?: { orbit?: string; field_of_view?: string };
  view?: { camera_orbit_degrees?: { theta: number; phi: number } };
  shared?: boolean;
  glbKey?: string;
  previewKey?: string;
};

export const studioHdr = STUDIO_HDR;
export const cityPanorama = CITY_PANORAMA;

export function publishSeedItem(item: CatalogItem): CatalogItem {
  return {
    ...item,
    shared: true,
    files: {
      glb: catalogAssetUrl(item.id, item.files.glb),
      preview: catalogAssetUrl(item.id, item.files.preview),
      ...(item.files.blend ? { blend: catalogAssetUrl(item.id, item.files.blend) } : {}),
    },
  };
}

export const seedCatalog: CatalogItem[] = (rawCatalog as CatalogItem[]).map(publishSeedItem);

export function rewriteSampleUrl(path: string | undefined | null) {
  return path ? sampleAssetUrl(path) : path;
}
