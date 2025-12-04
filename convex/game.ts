import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORD_CATEGORIES } from "./constants"
import { Doc } from "./_generated/dataModel" // IMPORTANTE: Importar Doc

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

    // TIPADO CORREGIDO: Especificamos que players es un array de Doc<"players">
    const players: Doc<"players">[] = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect()

    const category = room.category || "Animales"
    // @ts-ignore
    const words = WORD_CATEGORIES[category] || WORD_CATEGORIES.Animales
    const word = words[Math.floor(Math.random() * words.length)]

    let impostorCount = 1
    if (room.gameMode === "double" && players.length >= 5) {
      impostorCount = 2
    }

    const shuffledPlayers = shuffleArray(players)
    const impostorIds = shuffledPlayers.slice(0, impostorCount).map((p) => p.sessionId)

    if (room.gameMode === "secret") {
      const roles = ["detective", "clown"]
      // TIPADO CORREGIDO: p tiene tipo correcto ahora
      const roleAssignments = shuffleArray(players.filter((p) => !impostorIds.includes(p.sessionId))).slice(0, 2)

      for (let i = 0; i < roleAssignments.length && i < roles.length; i++) {
        // TIPADO CORREGIDO: roleAssignments[i] ya no es unknown
        await ctx.db.patch(roleAssignments[i]._id, {
          secretRole: roles[i],
        })
      }
    }

    const turnOrder = shuffleArray(players.map((p) => p.sessionId))

    await ctx.db.patch(args.roomId, {
      status: "playing",
      currentWord: word,
      impostorIds,
      turnOrder,
      currentTurnIndex: 0,
      turnStartTime: Date.now(),
      roundNumber: 1,
      turnsPlayed: 0, // Reiniciar contador de turnos
    })

    return { word, impostorIds }
  },
})

// En convex/game.ts

export const passTurn = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId)
    if (!room || room.status !== "playing") {
      throw new Error("Invalid game state")
    }

    // Necesitamos los jugadores para saber quién está eliminado
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect()

    // Lógica de límite de turnos (se mantiene igual)
    const totalPlayers = room.turnOrder.length
    const currentTurns = (room.turnsPlayed || 0) + 1
    const maxTurns = totalPlayers * 3

    if (currentTurns >= maxTurns) {
       for (const player of players) await ctx.db.patch(player._id, { votedFor: undefined })
       await ctx.db.patch(args.roomId, {
         status: "voting",
         votingStartTime: Date.now(),
         turnsPlayed: 0
       })
       return;
    }

    // --- CORRECCIÓN: SALTAR JUGADORES ELIMINADOS ---
    let nextIndex = (room.currentTurnIndex + 1) % room.turnOrder.length
    let loopCount = 0
    
    // Buscamos el siguiente jugador que NO esté eliminado
    while (loopCount < room.turnOrder.length) {
        const nextSessionId = room.turnOrder[nextIndex]
        const nextPlayer = players.find(p => p.sessionId === nextSessionId)
        
        // Si encontramos un jugador vivo, paramos aquí
        if (nextPlayer && !nextPlayer.isEliminated) {
            break
        }
        
        // Si está eliminado, avanzamos al siguiente índice
        nextIndex = (nextIndex + 1) % room.turnOrder.length
        loopCount++
    }
    // ----------------------------------------------

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

    // SEGURIDAD: Solo el Host puede llamar a votación
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

    // 1. Contar votos
    const voteCounts: Record<string, number> = {}
    for (const player of players) {
      if (player.votedFor && !player.isEliminated) {
        voteCounts[player.votedFor] = (voteCounts[player.votedFor] || 0) + 1
      }
    }

    // 2. Encontrar al más votado (Manejo de empates)
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

    // 3. Determinar Estado del Juego (Ganar o Continuar)
    let winner: "citizens" | "impostors" | "clown" | "continue" = "continue"

    if (eliminatedSessionId) {
      const eliminatedPlayer = players.find((p) => p.sessionId === eliminatedSessionId)
      
      // Marcar eliminado
      if (eliminatedPlayer) {
        await ctx.db.patch(eliminatedPlayer._id, { isEliminated: true })
      }

      // Re-calcular contadores tras eliminación
      // Nota: Usamos el estado actualizado virtualmente
      const activePlayers = players.filter(p => !p.isEliminated && p.sessionId !== eliminatedSessionId)
      const activeImpostors = activePlayers.filter(p => room.impostorIds.includes(p.sessionId))
      const activeCitizens = activePlayers.filter(p => !room.impostorIds.includes(p.sessionId))

      // Chequear victoria del Payaso
      if (room.gameMode === "secret" && eliminatedPlayer?.secretRole === "clown") {
        winner = "clown"
      } 
      // Chequear victoria Ciudadanos (0 impostores vivos)
      else if (activeImpostors.length === 0) {
        winner = "citizens"
        // Puntos Ciudadanos
        for (const player of players) {
            if (!room.impostorIds.includes(player.sessionId)) await ctx.db.patch(player._id, { score: player.score + 10 })
        }
      } 
      // Chequear victoria Impostores (Impostores >= Ciudadanos)
      else if (activeImpostors.length >= activeCitizens.length) {
        winner = "impostors"
        // Puntos Impostores
        for (const player of players) {
            if (room.impostorIds.includes(player.sessionId)) await ctx.db.patch(player._id, { score: player.score + 15 })
        }
      }
      // Si no se cumple ninguna, winner sigue siendo "continue"
    } else {
      // Empate, nadie eliminado, el juego continúa
      winner = "continue"
    }

    await ctx.db.patch(args.roomId, {
      status: "results",
    })

    return { winner, eliminatedSessionId, voteCounts }
  },
})

// En convex/game.ts

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

      // --- CORRECCIÓN: EMPEZAR CON JUGADOR VIVO ---
      // Encontrar el primer índice válido (puede que no sea el 0 si el primer jugador fue eliminado)
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
      // -------------------------------------------
  
      await ctx.db.patch(args.roomId, {
        status: "playing",
        currentTurnIndex: startIndex, // Usamos el índice calculado
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