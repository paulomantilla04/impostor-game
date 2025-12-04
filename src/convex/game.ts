import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORD_CATEGORIES } from "./constants"

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const startGame = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.hostId !== args.sessionId) {
      throw new Error("Only host can start game")
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q: any) => q.eq("roomId", args.roomId))
      .collect()

    // Pick random word from selected category
    const category = room.category || "Animals"
    const words = WORD_CATEGORIES[category as keyof typeof WORD_CATEGORIES] || WORD_CATEGORIES.Animals
    const word = words[Math.floor(Math.random() * words.length)]

    // Determine number of impostors based on game mode
    let impostorCount = 1
    if (room.gameMode === "double") {
      impostorCount = 2
    }

    // Randomly assign impostor(s)
    const shuffledPlayers = shuffleArray(players)
    const impostorIds = shuffledPlayers.slice(0, impostorCount).map((p) => p.sessionId)

    // Assign secret roles if in secret roles mode
    if (room.gameMode === "secret") {
      const roles = ["detective", "clown"]
      const roleAssignments = shuffleArray(players.filter((p: any) => !impostorIds.includes(p.sessionId))).slice(0, 2)

      for (let i = 0; i < roleAssignments.length && i < roles.length; i++) {
        await ctx.db.patch(roleAssignments[i]._id, {
          secretRole: roles[i],
        })
      }
    }

    // Create turn order
    const turnOrder = shuffleArray(players.map((p) => p.sessionId))

    // Update room
    await ctx.db.patch(args.roomId, {
      status: "playing",
      currentWord: word,
      impostorIds,
      turnOrder,
      currentTurnIndex: 0,
      turnStartTime: Date.now(),
      roundNumber: room.roundNumber + 1,
    })

    return { word, impostorIds }
  },
})

export const passTurn = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx: any, args: any) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.status !== "playing") {
      throw new Error("Invalid game state")
    }

    const nextIndex = (room.currentTurnIndex + 1) % room.turnOrder.length
    await ctx.db.patch(args.roomId, {
      currentTurnIndex: nextIndex,
      turnStartTime: Date.now(),
    })
  },
})

export const callVote = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.status !== "playing") {
      throw new Error("Invalid game state")
    }

    // Reset all votes
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q: any) => q.eq("roomId", args.roomId))
      .collect()

    for (const player of players) {
      await ctx.db.patch(player._id, {
        votedFor: undefined,
      })
    }

    await ctx.db.patch(args.roomId, {
      status: "voting",
      votingStartTime: Date.now(),
    })
  },
})

export const vote = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
    targetSessionId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.status !== "voting") {
      throw new Error("Not in voting phase")
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
      .filter((q: any) => q.eq(q.field("roomId"), args.roomId))
      .first()

    if (!player || player.isEliminated) {
      throw new Error("Invalid player")
    }

    await ctx.db.patch(player._id, {
      votedFor: args.targetSessionId,
    })
  },
})

export const processResults = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx: any, args: any) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.status !== "voting") {
      throw new Error("Not in voting phase")
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q: any) => q.eq("roomId", args.roomId))
      .collect()

    // Tally votes
    const voteCounts: Record<string, number> = {}
    for (const player of players) {
      if (player.votedFor && !player.isEliminated) {
        voteCounts[player.votedFor] = (voteCounts[player.votedFor] || 0) + 1
      }
    }

    // Find most voted player
    let maxVotes = 0
    let eliminatedSessionId: string | null = null

    for (const [sessionId, votes] of Object.entries(voteCounts)) {
      if (votes > maxVotes) {
        maxVotes = votes
        eliminatedSessionId = sessionId
      }
    }

    // Determine winner
    let winner: "citizens" | "impostors" | "clown" = "citizens"

    if (eliminatedSessionId) {
      const eliminatedPlayer = players.find((p: any) => p.sessionId === eliminatedSessionId)

      // Check for clown win
      if (room.gameMode === "secret" && eliminatedPlayer?.secretRole === "clown") {
        winner = "clown"
      } else if (room.impostorIds.includes(eliminatedSessionId)) {
        winner = "citizens"
        // Award points to citizens
        for (const player of players) {
          if (!room.impostorIds.includes(player.sessionId)) {
            await ctx.db.patch(player._id, {
              score: player.score + 10,
            })
          }
        }
      } else {
        winner = "impostors"
        // Award points to impostors
        for (const player of players) {
          if (room.impostorIds.includes(player.sessionId)) {
            await ctx.db.patch(player._id, {
              score: player.score + 15,
            })
          }
        }
      }

      // Mark player as eliminated
      if (eliminatedPlayer) {
        await ctx.db.patch(eliminatedPlayer._id, {
          isEliminated: true,
        })
      }
    }

    await ctx.db.patch(args.roomId, {
      status: "results",
    })

    return { winner, eliminatedSessionId, voteCounts }
  },
})

export const playAgain = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.hostId !== args.sessionId) {
      throw new Error("Only host can restart")
    }

    // Reset player states but keep scores
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q: any) => q.eq("roomId", args.roomId))
      .collect()

    for (const player of players) {
      await ctx.db.patch(player._id, {
        isEliminated: false,
        votedFor: undefined,
        secretRole: undefined,
        isReady: player.isHost, // Reset ready status
      })
    }

    await ctx.db.patch(args.roomId, {
      status: "waiting",
      currentWord: undefined,
      impostorIds: [],
      turnOrder: [],
      currentTurnIndex: 0,
      turnStartTime: undefined,
      votingStartTime: undefined,
    })
  },
})

export const resetRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.hostId !== args.sessionId) {
      throw new Error("Only host can reset")
    }

    // Reset all players completely
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q: any) => q.eq("roomId", args.roomId))
      .collect()

    for (const player of players) {
      await ctx.db.patch(player._id, {
        isEliminated: false,
        score: 0,
        votedFor: undefined,
        secretRole: undefined,
        isReady: player.isHost,
      })
    }

    await ctx.db.patch(args.roomId, {
      status: "waiting",
      currentWord: undefined,
      impostorIds: [],
      turnOrder: [],
      currentTurnIndex: 0,
      turnStartTime: undefined,
      votingStartTime: undefined,
      roundNumber: 0,
    })
  },
})

export const getCurrentPlayer = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx: any, args: any) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.status !== "playing") {
      return null
    }

    const currentSessionId = room.turnOrder[room.currentTurnIndex]
    const player = await ctx.db
      .query("players")
      .withIndex("by_session", (q: any) => q.eq("sessionId", currentSessionId))
      .filter((q: any) => q.eq(q.field("roomId"), args.roomId))
      .first()

    return player
  },
})
