'use client';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { seedCatalog, type CatalogItem } from './items';

export function useCatalog(): CatalogItem[] {
  const live = useQuery(api.catalog.list);
  if (!live?.length) return seedCatalog;
  const shared = live.filter((item) => item.shared);
  return shared.length ? live : [...seedCatalog, ...live];
}
