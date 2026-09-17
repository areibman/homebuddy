import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("studio"), v.literal("residence"), v.literal("atelier"), v.literal("estate")),
    interval: v.optional(v.union(v.literal("month"), v.literal("year"))),
    credits: v.number(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
  }).index("by_user", ["userId"]).index("by_customer", ["stripeCustomerId"]),
  homes: defineTable({
    userId: v.id("users"),
    name: v.string(),
    place: v.optional(v.string()),
    notes: v.optional(v.string()),
    sampleId: v.optional(v.string()),
    style: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  homeFiles: defineTable({
    homeId: v.id("homes"),
    userId: v.id("users"),
    kind: v.union(v.literal("floor_plan"), v.literal("photo")),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    createdAt: v.number(),
  }).index("by_home", ["homeId"]),
  customFurniture: defineTable({
    userId: v.id("users"),
    name: v.string(),
    category: v.string(),
    widthM: v.number(),
    depthM: v.number(),
    heightM: v.number(),
    glbStorageId: v.id("_storage"),
    previewStorageId: v.optional(v.id("_storage")),
    creditsCharged: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  arrangements: defineTable({
    userId: v.id("users"),
    homeId: v.id("homes"),
    style: v.string(),
    prompt: v.optional(v.string()),
    creditsCharged: v.number(),
    status: v.union(
      v.literal("reserved"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    summary: v.optional(v.string()),
    pieces: v.optional(v.array(v.object({
      id: v.string(),
      quantity: v.number(),
      reason: v.string(),
    }))),
    createdAt: v.number(),
  }).index("by_home", ["homeId"]).index("by_user", ["userId"]),
  creditLedger: defineTable({
    userId: v.id("users"),
    delta: v.number(),
    reason: v.string(),
    ref: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_ref", ["ref"]),
  stripeEvents: defineTable({
    eventId: v.string(),
    createdAt: v.number(),
  }).index("by_event", ["eventId"]),
});
