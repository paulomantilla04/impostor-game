"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Skull, Eye, RefreshCw, RotateCcw, Crown, Star } from "lucide-react"
import type { Doc } from "@/convex/_generated/dataModel"

interface ResultsPhaseProps {
  room: Doc<"rooms">
  players: Doc<"players">[]
  sessionId: string
  isHost: boolean
}

export function ResultsPhase({ room, players, sessionId, isHost }: ResultsPhaseProps) {
  const playAgain = useMutation(api.game.playAgain)
  const resetRoom = useMutation(api.game.resetRoom)

  // Determine winner
  const { winner, eliminatedPlayer, impostors } = useMemo(() => {
    const eliminated = players.find((p) => p.isEliminated)
    const impostorPlayers = players.filter((p) => room.impostorIds.includes(p.sessionId))

    let winnerType: "citizens" | "impostors" | "clown" = "citizens"

    if (eliminated) {
      if (room.gameMode === "secret" && eliminated.secretRole === "clown") {
        winnerType = "clown"
      } else if (room.impostorIds.includes(eliminated.sessionId)) {
        winnerType = "citizens"
      } else {
        winnerType = "impostors"
      }
    }

    return {
      winner: winnerType,
      eliminatedPlayer: eliminated,
      impostors: impostorPlayers,
    }
  }, [players, room.impostorIds, room.gameMode])

  // Sort players by score
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score)
  }, [players])

  const handlePlayAgain = async () => {
    await playAgain({ roomId: room._id, sessionId })
  }

  const handleResetRoom = async () => {
    await resetRoom({ roomId: room._id, sessionId })
  }

  const getWinnerDisplay = () => {
    switch (winner) {
      case "citizens":
        return {
          title: "Citizens Win!",
          subtitle: "The impostor was caught!",
          icon: <Trophy className="w-12 h-12" />,
          color: "from-green-500 to-emerald-600",
          bgColor: "bg-green-500/20",
        }
      case "impostors":
        return {
          title: "Impostor Wins!",
          subtitle: "An innocent was eliminated...",
          icon: <Skull className="w-12 h-12" />,
          color: "from-red-500 to-rose-600",
          bgColor: "bg-red-500/20",
        }
      case "clown":
        return {
          title: "Clown Wins!",
          subtitle: "The clown wanted to be voted out!",
          icon: <span className="text-5xl">🤡</span>,
          color: "from-purple-500 to-pink-600",
          bgColor: "bg-purple-500/20",
        }
    }
  }

  const winnerDisplay = getWinnerDisplay()

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-background to-primary/10">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Winner Announcement */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${winnerDisplay.bgColor} mb-4`}
          >
            <div className={`bg-gradient-to-br ${winnerDisplay.color} rounded-full p-4 text-white`}>
              {winnerDisplay.icon}
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-bold text-foreground mb-2"
          >
            {winnerDisplay.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-muted-foreground"
          >
            {winnerDisplay.subtitle}
          </motion.p>
        </motion.div>

        {/* Reveal Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Eye className="w-5 h-5 text-primary" />
                The Reveal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Secret Word */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30 text-center">
                <p className="text-sm text-muted-foreground mb-1">The secret word was</p>
                <p className="text-3xl font-bold text-primary">{room.currentWord}</p>
              </div>

              {/* Impostors */}
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                <p className="text-sm text-muted-foreground mb-3">
                  {impostors.length > 1 ? "The Impostors were" : "The Impostor was"}
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {impostors.map((impostor) => (
                    <motion.div
                      key={impostor._id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1 }}
                      className="flex items-center gap-2 px-4 py-2 bg-destructive/20 rounded-full border border-destructive/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground font-bold text-sm">
                        {impostor.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-destructive">{impostor.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Eliminated Player */}
              {eliminatedPlayer && (
                <div className="p-4 bg-secondary/50 rounded-lg border border-border/50 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Eliminated this round</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                      {eliminatedPlayer.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">{eliminatedPlayer.name}</span>
                    {eliminatedPlayer.secretRole && (
                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                        {eliminatedPlayer.secretRole}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Scoreboard */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Star className="w-5 h-5 text-yellow-500" />
                Scoreboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedPlayers.map((player, index) => (
                  <motion.div
                    key={player._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.1 + index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      index === 0
                        ? "bg-yellow-500/10 border border-yellow-500/30"
                        : "bg-secondary/30 border border-border/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? "bg-yellow-500 text-yellow-950"
                            : index === 1
                              ? "bg-gray-400 text-gray-900"
                              : index === 2
                                ? "bg-amber-600 text-amber-950"
                                : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{player.name}</span>
                        {player.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                        {room.impostorIds.includes(player.sessionId) && (
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="flex gap-4"
          >
            <Button
              onClick={handlePlayAgain}
              size="lg"
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Play Again
            </Button>
            <Button onClick={handleResetRoom} variant="outline" size="lg" className="flex-1 bg-transparent">
              <RotateCcw className="w-5 h-5 mr-2" />
              Reset Room
            </Button>
          </motion.div>
        )}

        {!isHost && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-center text-muted-foreground"
          >
            Waiting for host to start next round...
          </motion.p>
        )}
      </div>
    </div>
  )
}
