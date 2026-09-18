import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const item = v.object({
  slug: v.string(),
  name: v.string(),
  category: v.string(),
  description: v.string(),
  materials: v.array(v.string()),
  widthM: v.number(),
  depthM: v.number(),
  heightM: v.number(),
  provenance: v.string(),
  dimensionsNote: v.optional(v.string()),
  retailer: v.string(),
  sourceUrl: v.string(),
  photoUrl: v.string(),
  articleNumber: v.string(),
  checkedDate: v.string(),
  glbKey: v.string(),
  previewKey: v.string(),
  blendKey: v.optional(v.string()),
  viewerOrbit: v.optional(v.string()),
});

const interior = v.object({
  slug: v.string(),
  title: v.string(),
  subtitle: v.string(),
  beds: v.number(),
  sqft: v.number(),
  planJson: v.string(),
  listingJson: v.string(),
  floorPlanKey: v.string(),
  downloadKey: v.string(),
  layoutDownloadsJson: v.optional(v.string()),
  location: v.optional(v.string()),
  panoramaKey: v.optional(v.string()),
});

export const apply = internalMutation({
  args: { items: v.array(item), interiors: v.array(interior) },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.catalog.seedShared, { items: args.items });
    for (const home of args.interiors) {
      await ctx.runMutation(internal.interiors.save, {
        ...home,
        status: "ready",
      });
    }
    return { items: args.items.length, interiors: args.interiors.length };
  },
});
