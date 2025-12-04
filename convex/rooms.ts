import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { MIN_PLAYERS } from "./constants"

// Generate a random 4-6 letter room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const length = Math.floor(Math.random() * 3) + 4 // 4-6 characters
  let code = ""
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export const createRoom = mutation({
  args: {
    hostName: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    // Generate unique room code
    let code = generateRoomCode()
    let existing = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q: any) => q.eq("code", code))
      .first()

    while (existing) {
      code = generateRoomCode()
      existing = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q: any) => q.eq("code", code))
        .first()
    }

    // Create room
    const roomId = await ctx.db.insert("rooms", {
      code,
      hostId: args.sessionId,
      status: "waiting",
      impostorIds: [],
      gameMode: "classic",
      discussionTime: 300,
      turnOrder: [],
      currentTurnIndex: 0,
      roundNumber: 0,
    })

    // Add host as first player
    await ctx.db.insert("players", {
      name: args.hostName,
      roomId,
      isHost: true,
      isReady: true, // Host is always ready
      isEliminated: false,
      score: 0,
      sessionId: args.sessionId,
    })

    return { roomId, code }
  },
})

export const joinRoom = mutation({
  args: {
    playerName: v.string(),
    roomCode: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    // Find room by code
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q: any) => q.eq("code", args.roomCode.toUpperCase()))
      .first()

    if (!room) {
      throw new Error("Room not found")
    }

    if (room.status !== "waiting") {
      throw new Error("Game already in progress")
    }

    // Check if player already exists in this room
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
      .filter((q: any) => q.eq(q.field("roomId"), room._id))
      .first()

    if (existingPlayer) {
      return { roomId: room._id, playerId: existingPlayer._id }
    }

    // Add player to room
    const playerId = await ctx.db.insert("players", {
      name: args.playerName,
      roomId: room._id,
      isHost: false,
      isReady: false,
      isEliminated: false,
      score: 0,
      sessionId: args.sessionId,
    })

    return { roomId: room._id, playerId }
  },
})

export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx: any, args: any) => {
    return await ctx.db.get(args.roomId)
  },
})

export const getRoomByCode = query({
  args: { code: v.string() },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_code", (q: any) => q.eq("code", args.code.toUpperCase()))
      .first()
  },
})

export const getPlayers = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("players")
      .withIndex("by_room", (q: any) => q.eq("roomId", args.roomId))
      .collect()
  },
})

export const toggleReady = mutation({
  args: {
    sessionId: v.string(),
    roomId: v.id("rooms"),
  },
  handler: async (ctx: any, args: any) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
      .filter((q: any) => q.eq(q.field("roomId"), args.roomId))
      .first()

    if (!player || player.isHost) {
      throw new Error("Invalid player")
    }

    await ctx.db.patch(player._id, {
      isReady: !player.isReady,
    })
  },
})

export const updateRoomSettings = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
    gameMode: v.optional(v.string()),
    category: v.optional(v.string()),
    discussionTime: v.optional(v.number()),
  },
  handler: async (ctx: any, args: any) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.hostId !== args.sessionId) {
      throw new Error("Only host can update settings")
    }

    const updates: any = {}
    if (args.gameMode) updates.gameMode = args.gameMode
    if (args.category) updates.category = args.category
    if (args.discussionTime) updates.discussionTime = args.discussionTime

    await ctx.db.patch(args.roomId, updates)
  },
})

export const canStartGame = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx: any, args: any) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q: any) => q.eq("roomId", args.roomId))
      .collect()

    if (players.length < MIN_PLAYERS) {
      return { canStart: false, reason: `Necesita al menos ${MIN_PLAYERS} jugadores` }
    }

    const allReady = players.every((p: any) => p.isReady || p.isHost)
    if (!allReady) {
      return { canStart: false, reason: "Todos los jugadores deben estar listos" }
    }

    return { canStart: true }
  },
})
