import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  bookmarks: defineTable({
    url: v.string(),
    title: v.string(),
    tags: v.array(v.string()),
    comment: v.optional(v.string()),
    favicon: v.string(),
  }),
});
