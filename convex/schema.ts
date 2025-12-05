import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    hostId: v.string(),
    status: v.union(v.literal("waiting"), v.literal("playing"), v.literal("voting"), v.literal("results")),
    currentWord: v.optional(v.string()),
    wrongWord: v.optional(v.string()), // <--- NUEVO CAMPO
    category: v.optional(v.string()),
    impostorIds: v.array(v.string()),
    gameMode: v.string(),
    discussionTime: v.number(),
    turnOrder: v.array(v.string()),
    currentTurnIndex: v.number(),
    turnStartTime: v.optional(v.number()),
    votingStartTime: v.optional(v.number()),
    roundNumber: v.number(),
    turnsPlayed: v.optional(v.number()),
  }).index("by_code", ["code"]),

  players: defineTable({
    name: v.string(),
    roomId: v.id("rooms"),
    isHost: v.boolean(),
    isReady: v.boolean(),
    isEliminated: v.boolean(),
    score: v.number(),
    secretRole: v.optional(v.string()), 
    votedFor: v.optional(v.string()),
    sessionId: v.string(),
  })
    .index("by_room", ["roomId"])
    .index("by_session", ["sessionId"]),
})