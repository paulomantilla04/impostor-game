"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Skull, Eye, RefreshCw, RotateCcw, Crown, Star, ArrowRight, Ghost, Check } from "lucide-react"
import type { Doc } from "../../../convex/_generated/dataModel"

interface ResultsPhaseProps {
  room: Doc<"rooms">
  players: Doc<"players">[]
  sessionId: string
  isHost: boolean
}

export function ResultsPhase({ room, players, sessionId, isHost }: ResultsPhaseProps) {
  const playAgain = useMutation(api.game.playAgain)
  const resetRoom = useMutation(api.game.resetRoom)
  const nextRound = useMutation(api.game.nextRound)

  // Calcular estado del juego y último eliminado
  const { winnerType, impostors, justEliminatedPlayer } = useMemo(() => {
    
    // 1. Determinar quién fue eliminado en esta última ronda
    // Lo deducimos mirando quién tiene más votos en sus espaldas (ya que acabamos de venir de votar)
    let maxVotes = 0;
    let justEliminatedId = null;
    
    // Contamos votos manualmente porque el backend ya los procesó pero los datos persisten en 'players' hasta que llamemos a nextRound
    const voteCounts: Record<string, number> = {}
    players.forEach(p => {
        if(p.votedFor) {
            voteCounts[p.votedFor] = (voteCounts[p.votedFor] || 0) + 1;
        }
    });

    // Buscamos quién tiene más votos
    let candidates: string[] = [];
    Object.entries(voteCounts).forEach(([pid, count]) => {
        if(count > maxVotes) {
            maxVotes = count;
            candidates = [pid];
        } else if (count === maxVotes) {
            candidates.push(pid);
        }
    });

    if (candidates.length === 1) {
        justEliminatedId = candidates[0];
    }

    const justEliminated = players.find(p => p.sessionId === justEliminatedId);

    // 2. Determinar estado del juego (revisamos la lógica de victoria)
    const activePlayers = players.filter(p => !p.isEliminated)
    const activeImpostors = activePlayers.filter(p => room.impostorIds.includes(p.sessionId))
    const activeCitizens = activePlayers.filter(p => !room.impostorIds.includes(p.sessionId))
    
    let state = "continue"
    
    if (activeImpostors.length === 0) state = "citizens"
    else if (activeImpostors.length >= activeCitizens.length) state = "impostors"
    else if (players.some(p => p.secretRole === "clown" && p.isEliminated)) state = "clown"
    
    return {
      winnerType: state,
      justEliminatedPlayer: justEliminated,
      impostors: players.filter(p => room.impostorIds.includes(p.sessionId))
    }
  }, [players, room.impostorIds, room.gameMode])

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score)
  }, [players])

  const handlePlayAgain = async () => {
    await playAgain({ roomId: room._id, sessionId })
  }

  const handleResetRoom = async () => {
    await resetRoom({ roomId: room._id, sessionId })
  }
  
  const handleNextRound = async () => {
    await nextRound({ roomId: room._id, sessionId })
  }

  const getWinnerDisplay = () => {
    switch (winnerType) {
      case "citizens":
        return {
          title: "¡Los tilines ganan!",
          subtitle: "¡El impostor fue atrapado!",
          icon: <Trophy className="w-12 h-12" />,
          color: "from-green-500 to-emerald-600",
          bgColor: "bg-green-500/20",
        }
      case "impostors":
        return {
          title: "¡Los impostores ganan!",
          subtitle: "Superaron en número a los ciudadanos...",
          icon: <Skull className="w-12 h-12" />,
          color: "from-red-500 to-rose-600",
          bgColor: "bg-red-500/20",
        }
      case "clown":
        return {
          title: "¡Payaso Gana!",
          subtitle: "¡Quería ser eliminado y lo logró!",
          icon: <span className="text-5xl">🤡</span>,
          color: "from-purple-500 to-pink-600",
          bgColor: "bg-purple-500/20",
        }
      default: // continue
        // Lógica personalizada para el mensaje de eliminación
        if (justEliminatedPlayer) {
            const isImp = room.impostorIds.includes(justEliminatedPlayer.sessionId);
            return {
                title: isImp ? "¡Impostor Eliminado!" : `${justEliminatedPlayer.name} era Inocente`,
                subtitle: isImp ? "¡Bien hecho! Pero puede que queden más..." : "Ups... cometieron un error. El juego continúa.",
                icon: isImp ? <Check className="w-12 h-12" /> : <Ghost className="w-12 h-12" />, // Check no existe aqui, usare Ghost o Skull
                color: isImp ? "from-green-500 to-emerald-600" : "from-gray-500 to-gray-700",
                bgColor: isImp ? "bg-green-500/20" : "bg-gray-500/20",
            }
        }
        return {
            title: "Nadie fue eliminado",
            subtitle: "Hubo un empate en los votos. El juego continúa.",
            icon: <RefreshCw className="w-12 h-12" />,
            color: "from-blue-500 to-cyan-600",
            bgColor: "bg-blue-500/20",
        }
    }
  }

  const winnerDisplay = getWinnerDisplay()
  const isGameOver = winnerType !== "continue"

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-background to-primary/10">
      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        
        {/* Winner/Status Announcement */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${winnerDisplay.bgColor} mb-4`}>
            <div className={`bg-gradient-to-br ${winnerDisplay.color} rounded-full p-4 text-white`}>
              {winnerType === "continue" && !justEliminatedPlayer ? <RefreshCw className="w-12 h-12"/> : 
               winnerType === "continue" && justEliminatedPlayer && !room.impostorIds.includes(justEliminatedPlayer.sessionId) ? <Ghost className="w-12 h-12"/> :
               winnerDisplay.icon}
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">{winnerDisplay.title}</h1>
          <p className="text-muted-foreground">{winnerDisplay.subtitle}</p>
        </motion.div>

        {/* Reveal Card (Solo si terminó el juego) */}
        {isGameOver && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
                <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <Eye className="w-5 h-5 text-primary" />
                    La Revelación
                </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/30 text-center">
                    <p className="text-sm text-muted-foreground mb-1">La palabra secreta era</p>
                    <p className="text-3xl font-bold text-primary">{room.currentWord}</p>
                </div>
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                    <p className="text-sm text-muted-foreground mb-3">Los Impostores eran</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                    {impostors.map((impostor) => (
                        <div key={impostor._id} className="flex items-center gap-2 px-4 py-2 bg-destructive/20 rounded-full border border-destructive/50">
                        <span className="font-medium text-destructive">{impostor.name}</span>
                        </div>
                    ))}
                    </div>
                </div>
                </CardContent>
            </Card>
            </motion.div>
        )}

        {/* Scoreboard - SIEMPRE VISIBLE AHORA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: isGameOver ? 0.4 : 0.2 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Star className="w-5 h-5 text-yellow-500" />
                Tabla de Puntuación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedPlayers.map((player, index) => (
                  <motion.div
                    key={player._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      index === 0
                        ? "bg-yellow-500/10 border border-yellow-500/30"
                        : "bg-secondary/30 border border-border/50"
                    } ${player.isEliminated ? "opacity-50 grayscale" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 font-mono text-muted-foreground">#{index + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{player.name}</span>
                        {player.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                        {player.isEliminated && <Ghost className="w-4 h-4 text-gray-500" />}
                        {/* Solo mostrar rol de impostor si el juego terminó */}
                        {isGameOver && room.impostorIds.includes(player.sessionId) && (
                          <span className="text-xs px-2 py-0.5 bg-destructive/20 text-destructive rounded-full">
                            Impostor
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-foreground">{player.score} pts</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        {isHost && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex gap-4 flex-col sm:flex-row">
            {isGameOver ? (
                <>
                    <Button onClick={handlePlayAgain} size="lg" className="flex-1">
                    <RefreshCw className="w-5 h-5 mr-2" /> Jugar de Nuevo
                    </Button>
                    <Button onClick={handleResetRoom} variant="outline" size="lg" className="flex-1">
                    <RotateCcw className="w-5 h-5 mr-2" /> Reiniciar Sala
                    </Button>
                </>
            ) : (
                <Button onClick={handleNextRound} size="lg" className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600">
                    <ArrowRight className="w-5 h-5 mr-2" /> Siguiente Ronda
                </Button>
            )}
          </motion.div>
        )}
        
        {!isHost && (
             <p className="text-center text-muted-foreground mt-4">Esperando al anfitrión...</p>
        )}

      </div>
    </div>
  )
}