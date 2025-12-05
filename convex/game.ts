import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORD_CATEGORIES } from "./constants"
import { Doc } from "./_generated/dataModel"

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
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.hostId !== args.sessionId) {
      throw new Error("Only host can start game")
    }

    const players: Doc<"players">[] = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect()

    if (room.gameMode === "confusion" && players.length < 4){
      throw new Error("Este modo requiere al menos 4 jugadores");
    }

    const categoryString = room.category || "Animales"
    const words = WORD_CATEGORIES[categoryString as keyof typeof WORD_CATEGORIES] || WORD_CATEGORIES.Animales;

    // Seleccionar palabra correcta
    const wordIndex = Math.floor(Math.random() * words.length);
    const word = words[wordIndex];

    // Seleccionar palabra incorrecta (si aplica)
    let wrongWord = undefined;
    if (room.gameMode === "confusion") {
      let wrongWordIndex = Math.floor(Math.random() * words.length);
      while (wrongWordIndex === wordIndex) {
        wrongWordIndex = Math.floor(Math.random() * words.length);
      }
      wrongWord = words[wrongWordIndex];
    }

    let impostorCount = 1
    if (room.gameMode === "double" && players.length >= 5) {
      impostorCount = 2
    }

    const shuffledPlayers = shuffleArray(players)
    const previousImpostorIds = room.impostorIds || []
    const validCandidates = shuffledPlayers.filter(p => !previousImpostorIds.includes(p.sessionId));
    const candidatePool = validCandidates.length >= impostorCount ? validCandidates : shuffledPlayers;

    const impostorIds = candidatePool.slice(0, impostorCount).map((p) => p.sessionId)

    // Filtrar a los que no son impostores para asignar roles especiales
    const citizens = players.filter((p) => !impostorIds.includes(p.sessionId));
    const shuffledCitizens = shuffleArray(citizens);

    // Modo Secret
    if (room.gameMode === "secret") {
      const roles = ["detective", "clown"]
      for (let i = 0; i < shuffledCitizens.length && i < roles.length; i++) {
        await ctx.db.patch(shuffledCitizens[i]._id, { secretRole: roles[i] })
      }
    }

    // Modo confusion
    if (room.gameMode === "confusion" && shuffledCitizens.length > 0){
      await ctx.db.patch(shuffledCitizens[0]._id, { secretRole: "confused"});
    }

    const turnOrder = shuffleArray(players.map((p) => p.sessionId))

    await ctx.db.patch(args.roomId, {
      status: "playing",
      currentWord: word,
      wrongWord: wrongWord,
      impostorIds,
      turnOrder,
      currentTurnIndex: 0,
      turnStartTime: Date.now(),
      roundNumber: 1,
      turnsPlayed: 0,
    })

    return { word, impostorIds }
  },
})

export const passTurn = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.status !== "playing") {
      throw new Error("Invalid game state")
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect()

    const totalPlayers = room.turnOrder.length
    const currentTurns = (room.turnsPlayed || 0) + 1
    const maxTurns = totalPlayers * 2

    if (currentTurns >= maxTurns) {
       for (const player of players) await ctx.db.patch(player._id, { votedFor: undefined })
       await ctx.db.patch(args.roomId, {
         status: "voting",
         votingStartTime: Date.now(),
         turnsPlayed: 0
       })
       return;
    }

    let nextIndex = (room.currentTurnIndex + 1) % room.turnOrder.length
    let loopCount = 0
    
    while (loopCount < room.turnOrder.length) {
        const nextSessionId = room.turnOrder[nextIndex]
        const nextPlayer = players.find(p => p.sessionId === nextSessionId)
        
        if (nextPlayer && !nextPlayer.isEliminated) {
            break
        }
        
        nextIndex = (nextIndex + 1) % room.turnOrder.length
        loopCount++
    }

    await ctx.db.patch(args.roomId, {
      currentTurnIndex: nextIndex,
      turnStartTime: Date.now(),
      turnsPlayed: currentTurns
    })
  },
})

export const callVote = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.status !== "playing") {
      throw new Error("Invalid game state")
    }

    if (room.hostId !== args.sessionId) {
      throw new Error("Solo el anfitrión puede llamar a votación")
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
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
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.status !== "voting") {
      throw new Error("Not in voting phase")
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
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
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.status !== "voting") {
      throw new Error("Not in voting phase")
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect()

    const voteCounts: Record<string, number> = {}
    for (const player of players) {
      if (player.votedFor && !player.isEliminated) {
        voteCounts[player.votedFor] = (voteCounts[player.votedFor] || 0) + 1
      }
    }

    let maxVotes = 0
    let candidates: string[] = [] 

    for (const [sessionId, votes] of Object.entries(voteCounts)) {
      if (votes > maxVotes) {
        maxVotes = votes
        candidates = [sessionId] 
      } else if (votes === maxVotes) {
        candidates.push(sessionId) 
      }
    }

    let eliminatedSessionId: string | null = null
    if (candidates.length === 1) {
      eliminatedSessionId = candidates[0]
    }

    let winner: "citizens" | "impostors" | "clown" | "continue" = "continue"

    if (eliminatedSessionId) {
      const eliminatedPlayer = players.find((p) => p.sessionId === eliminatedSessionId)
      
      if (eliminatedPlayer) {
        await ctx.db.patch(eliminatedPlayer._id, { isEliminated: true })
      }

      const activePlayers = players.filter(p => !p.isEliminated && p.sessionId !== eliminatedSessionId)
      const activeImpostors = activePlayers.filter(p => room.impostorIds.includes(p.sessionId))
      const activeCitizens = activePlayers.filter(p => !room.impostorIds.includes(p.sessionId))

      if (room.gameMode === "secret" && eliminatedPlayer?.secretRole === "clown") {
        winner = "clown"
      } 
      else if (activeImpostors.length === 0) {
        winner = "citizens"
        for (const player of players) {
            if (!room.impostorIds.includes(player.sessionId)) await ctx.db.patch(player._id, { score: player.score + 10 })
        }
      } 
      else if (activeImpostors.length >= activeCitizens.length) {
        winner = "impostors"
        for (const player of players) {
            if (room.impostorIds.includes(player.sessionId)) await ctx.db.patch(player._id, { score: player.score + 15 })
        }
      }
    } else {
      winner = "continue"
    }

    await ctx.db.patch(args.roomId, {
      status: "results",
    })

    return { winner, eliminatedSessionId, voteCounts }
  },
})


export const nextRound = mutation({
    args: {
      roomId: v.id("rooms"),
      sessionId: v.string(),
    },
    handler: async (ctx, args) => {
      const room = await ctx.db.get(args.roomId)
      if (!room || room.hostId !== args.sessionId) {
        throw new Error("Only host can start next round")
      }
  
      const players = await ctx.db.query("players").withIndex("by_room", (q) => q.eq("roomId", args.roomId)).collect()
      for (const player of players) {
        await ctx.db.patch(player._id, { votedFor: undefined })
      }

      let startIndex = 0
      let loopCount = 0
      
      while (loopCount < room.turnOrder.length) {
          const sessionId = room.turnOrder[startIndex]
          const player = players.find(p => p.sessionId === sessionId)
          
          if (player && !player.isEliminated) {
              break
          }
          startIndex = (startIndex + 1) % room.turnOrder.length
          loopCount++
      }
  
      await ctx.db.patch(args.roomId, {
        status: "playing",
        currentTurnIndex: startIndex,
        turnStartTime: Date.now(),
        turnsPlayed: 0,
      })
    },
})

export const playAgain = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.hostId !== args.sessionId) {
      throw new Error("Only host can restart")
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect()

    for (const player of players) {
      await ctx.db.patch(player._id, {
        isEliminated: false,
        votedFor: undefined,
        secretRole: undefined,
        isReady: player.isHost,
      })
    }

    await ctx.db.patch(args.roomId, {
      status: "waiting",
      currentWord: undefined,
      wrongWord: undefined,
      impostorIds: [],
      turnOrder: [],
      currentTurnIndex: 0,
      turnStartTime: undefined,
      votingStartTime: undefined,
      turnsPlayed: 0,
    })
  },
})

export const resetRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.hostId !== args.sessionId) {
      throw new Error("Only host can reset")
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
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
      wrongWord: undefined,
      impostorIds: [],
      turnOrder: [],
      currentTurnIndex: 0,
      turnStartTime: undefined,
      votingStartTime: undefined,
      roundNumber: 0,
      turnsPlayed: 0,
    })
  },
})

export const getCurrentPlayer = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.status !== "playing") {
      return null
    }

    const currentSessionId = room.turnOrder[room.currentTurnIndex]
    const player = await ctx.db
      .query("players")
      .withIndex("by_session", (q) => q.eq("sessionId", currentSessionId))
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first()

    return player
  },
})