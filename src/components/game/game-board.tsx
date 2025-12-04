"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Clock, ArrowRight, Vote, AlertTriangle, Smile } from "lucide-react"
import { TURN_TIME } from "../../../convex/constants"
import type { Doc } from "../../../convex/_generated/dataModel"

interface GameBoardProps {
    room: Doc<"rooms">
    players: Doc<"players">[]
    sessionId: string
    isHost: boolean
    currentPlayer?: Doc<"players">
}

const EMOJI_GRID = ["👍", "👎", "🤔", "😂", "😱", "🤫", "👀", "❓", "❌", "✅", "🔥", "💀"]

export function GameBoard({ room, players, sessionId, isHost, currentPlayer }: GameBoardProps) {
    const [showRole, setShowRole] = useState(false)
    const [isHolding, setIsHolding] = useState(false)
    const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIME)
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)

    const passTurn = useMutation(api.game.passTurn)
    const callVote = useMutation(api.game.callVote)

    const isImpostor = room.impostorIds.includes(sessionId)
    const currentTurnPlayer = players.find((p) => p.sessionId === room.turnOrder[room.currentTurnIndex])
    const isMyTurn = currentTurnPlayer?.sessionId === sessionId
    const isSilenceMode = room.gameMode === "silence"

    // Turn timer
    useEffect(() => {
        if (!room.turnStartTime) return

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - room.turnStartTime!) / 1000)
            const remaining = Math.max(0, TURN_TIME - elapsed)
            setTurnTimeLeft(remaining)
        }, 1000)

        return () => clearInterval(interval)
    }, [room.turnStartTime])

    const handlePassTurn = async () => {
        await passTurn({ roomId: room._id })
    }

    const handleCallVote = async () => {
        await callVote({ roomId: room._id, sessionId })
    }

    const handleEmojiClick = (emoji: string) => {
        setSelectedEmoji(emoji)
        setTimeout(() => setSelectedEmoji(null), 2000)
    }

    // Get role display info
    const getRoleInfo = () => {
        if (isImpostor) {
            return {
                title: "Tú eres el IMPOSTOR",
                subtitle: "Intenta pasar desapercibido sin saber la palabra!",
                color: "from-red-600 to-red-800",
                icon: <AlertTriangle className="w-8 h-8" />,
            }
        }

        let roleExtra = ""
        if (currentPlayer?.secretRole === "detective") {
            roleExtra = " (Detective)"
        } else if (currentPlayer?.secretRole === "clown") {
            roleExtra = " (Clown)"
        }

        return {
            title: room.currentWord || "???",
            subtitle: `Esta es la palabra secreta${roleExtra}`,
            color: "from-primary to-accent",
            icon: <Eye className="w-8 h-8" />,
        }
    }

    const roleInfo = getRoleInfo()

    return (
        <div className="min-h-screen p-4 bg-gradient-to-br from-background via-background to-primary/10">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
            </div>

            <div className="max-w-4xl mx-auto space-y-6 relative z-10">
                {/* Header with room info */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Round {room.roundNumber}</h1>
                        <p className="text-sm text-muted-foreground">Sala: {room.code}</p>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono">{Math.floor(room.discussionTime / 60)}:00 total</span>
                    </div>
                </motion.div>

                {/* Role Card - Hold to Reveal */}
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                    <Card
                        className={`border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden cursor-pointer transition-all ${isHolding ? "ring-2 ring-primary" : ""
                            }`}
                        onMouseDown={() => {
                            setIsHolding(true)
                            setShowRole(true)
                        }}
                        onMouseUp={() => {
                            setIsHolding(false)
                            setShowRole(false)
                        }}
                        onMouseLeave={() => {
                            setIsHolding(false)
                            setShowRole(false)
                        }}
                        onTouchStart={() => {
                            setIsHolding(true)
                            setShowRole(true)
                        }}
                        onTouchEnd={() => {
                            setIsHolding(false)
                            setShowRole(false)
                        }}
                    >
                        <CardContent className="p-8">
                            <AnimatePresence mode="wait">
                                {showRole ? (
                                    <motion.div
                                        key="revealed"
                                        initial={{ opacity: 0, rotateY: 90 }}
                                        animate={{ opacity: 1, rotateY: 0 }}
                                        exit={{ opacity: 0, rotateY: -90 }}
                                        className="text-center"
                                    >
                                        <div
                                            className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${roleInfo.color} text-white mb-4`}
                                        >
                                            {roleInfo.icon}
                                        </div>
                                        <h2 className={`text-3xl font-bold mb-2 ${isImpostor ? "text-red-500" : "text-primary"}`}>
                                            {roleInfo.title}
                                        </h2>
                                        <p className="text-muted-foreground">{roleInfo.subtitle}</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="hidden"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-center"
                                    >
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
                                            <EyeOff className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h2 className="text-xl font-medium text-foreground mb-2">Mantén presionado para revelar tu rol</h2>
                                        <p className="text-sm text-muted-foreground">No lo reveles!</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Current Turn Indicator */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentTurnPlayer?._id}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className={`relative w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg ${isMyTurn ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-background" : ""
                                                }`}
                                        >
                                            {currentTurnPlayer?.name.charAt(0).toUpperCase()}
                                            {isMyTurn && (
                                                <motion.div
                                                    className="absolute inset-0 rounded-full border-2 border-yellow-400"
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
                                                />
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {isMyTurn ? "Tu turno!" : `Turno de ${currentTurnPlayer?.name}`}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {isSilenceMode ? "Usa solo emojis!" : "Describe algo relacionado con la palabra"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-2xl font-mono font-bold text-foreground">{turnTimeLeft}s</p>
                                        <p className="text-xs text-muted-foreground">restantes</p>
                                    </div>
                                    {isMyTurn && (
                                        <Button onClick={handlePassTurn} variant="outline" size="sm">
                                            <ArrowRight className="w-4 h-4 mr-1" />
                                            Pasar turno
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Silence Mode Emoji Grid */}
                {isSilenceMode && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-foreground text-sm">
                                    <Smile className="w-4 h-4 text-primary" />
                                    Reacciona con emojis (Modo silencio)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-6 gap-2">
                                    {EMOJI_GRID.map((emoji) => (
                                        <Button
                                            key={emoji}
                                            variant="outline"
                                            className={`text-2xl h-12 ${selectedEmoji === emoji ? "bg-primary/20 border-primary" : ""}`}
                                            onClick={() => handleEmojiClick(emoji)}
                                        >
                                            {emoji}
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Player Grid */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-foreground text-sm">Jugadores</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                {room.turnOrder.map((sid, index) => {
                                    const player = players.find((p) => p.sessionId === sid)
                                    if (!player) return null
                                    const isActive = index === room.currentTurnIndex
                                    const isPast = index < room.currentTurnIndex

                                    return (
                                        <motion.div
                                            key={player._id}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${isActive ? "bg-primary/20 ring-2 ring-primary" : isPast ? "opacity-50" : "hover:bg-secondary/50"
                                                }`}
                                            animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                                            transition={{ repeat: isActive ? Number.POSITIVE_INFINITY : 0, duration: 2 }}
                                        >
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isActive
                                                        ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                                                        : "bg-secondary text-secondary-foreground"
                                                    }`}
                                            >
                                                {player.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs text-center truncate w-full text-foreground">{player.name}</span>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Call Vote Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-center"
                >
                    <Button onClick={handleCallVote} size="lg" variant="destructive" className="w-full max-w-md">
                        <Vote className="w-5 h-5 mr-2" />
                        Llama a votar
                    </Button>
                </motion.div>
            </div>
        </div>
    )
}
