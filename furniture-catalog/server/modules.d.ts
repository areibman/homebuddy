declare module '*asset-store.mjs' {
  export function contentTypeFor(key: string): string;
  export function isPublicAsset(key: string): boolean;
  export const assetStore: {
    mode: string;
    get(key: string): Promise<{ body: Buffer; contentType: string; size: number } | null>;
    readLocal(key: string): Promise<{ body: Buffer; contentType: string; size: number } | null>;
    signedGet(key: string, ttlSeconds?: number): string;
    put(key: string, body: Buffer | Uint8Array, contentType?: string): Promise<{ key: string; size: number; contentType: string }>;
    remove(key: string): Promise<void>;
    sign(key: string, ttlSeconds?: number): string;
    verify(key: string, exp: string | null, sig: string | null): boolean;
    userKey(userId: string, filename: string): string;
  };
}

declare module '*catalog-paths.mjs' {
  export function catalogAssetUrl(id: string, legacyPath: string): string;
  export function sampleAssetUrl(legacyPath: string): string;
  export const STUDIO_HDR: string;
  export const CITY_PANORAMA: string;
}
