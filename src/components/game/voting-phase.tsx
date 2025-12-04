"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Check, AlertTriangle, Gavel } from "lucide-react"
import { VOTING_TIME } from "@/convex/constants"
import type { Doc } from "@/convex/_generated/dataModel"

interface VotingPhaseProps {
  room: Doc<"rooms">
  players: Doc<"players">[]
  sessionId: string
  isHost: boolean
  currentPlayer?: Doc<"players">
}

export function VotingPhase({ room, players, sessionId, isHost, currentPlayer }: VotingPhaseProps) {
  const [timeLeft, setTimeLeft] = useState(VOTING_TIME)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)

  const vote = useMutation(api.game.vote)
  const processResults = useMutation(api.game.processResults)

  // Initialize hasVoted based on currentPlayer
  useEffect(() => {
    if (currentPlayer?.votedFor) {
      setHasVoted(true)
      setSelectedPlayer(currentPlayer.votedFor)
    }
  }, [currentPlayer?.votedFor])

  // Voting timer
  useEffect(() => {
    if (!room.votingStartTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - room.votingStartTime!) / 1000)
      const remaining = Math.max(0, VOTING_TIME - elapsed)
      setTimeLeft(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [room.votingStartTime])

  const handleVote = async (targetSessionId: string) => {
    if (hasVoted) return

    setSelectedPlayer(targetSessionId)
    await vote({ roomId: room._id, sessionId, targetSessionId })
    setHasVoted(true)
  }

  const handleForceReveal = async () => {
    await processResults({ roomId: room._id })
  }

  const activePlayers = players.filter((p) => !p.isEliminated)
  const votedCount = activePlayers.filter((p) => p.votedFor).length

  // Calculate vote counts for display (only show after voting)
  const getVoteCount = (playerSessionId: string) => {
    return activePlayers.filter((p) => p.votedFor === playerSessionId).length
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-background to-destructive/10">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-destructive/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/20 mb-4"
          >
            <Gavel className="w-8 h-8 text-destructive" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Voting Time</h1>
          <p className="text-muted-foreground">Who is the Impostor?</p>
        </motion.div>

        {/* Timer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center"
        >
          <div className="flex items-center gap-3 px-6 py-3 bg-secondary/50 rounded-full">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-3xl font-mono font-bold text-foreground">{timeLeft}s</span>
          </div>
        </motion.div>

        {/* Vote Progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-sm text-muted-foreground"
        >
          {votedCount} of {activePlayers.length} players have voted
        </motion.div>

        {/* Player Voting Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Vote for the Impostor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activePlayers
                  .filter((p) => p.sessionId !== sessionId)
                  .map((player, index) => {
                    const isSelected = selectedPlayer === player.sessionId
                    const voteCount = getVoteCount(player.sessionId)

                    return (
                      <motion.button
                        key={player._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        onClick={() => handleVote(player.sessionId)}
                        disabled={hasVoted}
                        className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                          isSelected
                            ? "bg-destructive/20 border-destructive"
                            : hasVoted
                              ? "bg-secondary/30 border-border/50 opacity-50 cursor-not-allowed"
                              : "bg-secondary/30 border-border/50 hover:bg-secondary/50 hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">{player.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasVoted && voteCount > 0 && (
                            <span className="text-sm text-muted-foreground">{voteCount} votes</span>
                          )}
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-destructive-foreground" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    )
                  })}
              </div>

              <AnimatePresence>
                {hasVoted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-center"
                  >
                    <Check className="w-5 h-5 text-green-500 inline mr-2" />
                    <span className="text-green-500 font-medium">Vote Confirmed!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Host Force Reveal */}
        {isHost && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center"
          >
            <Button onClick={handleForceReveal} variant="outline" size="lg">
              Force Reveal Results
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
