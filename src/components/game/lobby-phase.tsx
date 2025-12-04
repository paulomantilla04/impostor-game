"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Crown, Check, Copy, Users, Settings, Play, Loader2 } from "lucide-react"
import { GAME_MODES, DISCUSSION_TIMES, WORD_CATEGORIES } from "../../../convex/constants"
import type { Doc } from "../../../convex/_generated/dataModel"

interface LobbyPhaseProps {
    room: Doc<"rooms">
    players: Doc<"players">[]
    sessionId: string
    isHost: boolean
    currentPlayer?: Doc<"players">
}

export function LobbyPhase({ room, players, sessionId, isHost, currentPlayer }: LobbyPhaseProps) {
    const [copied, setCopied] = useState(false)
    const [isStarting, setIsStarting] = useState(false)

    const toggleReady = useMutation(api.rooms.toggleReady)
    const updateSettings = useMutation(api.rooms.updateRoomSettings)
    const startGame = useMutation(api.game.startGame)
    const canStartResult = useQuery(api.rooms.canStartGame, { roomId: room._id })

    const copyCode = async () => {
        const url = `${window.location.origin}/room/${room.code}`
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleToggleReady = async () => {
        await toggleReady({ sessionId, roomId: room._id })
    }

    const handleUpdateSettings = async (key: string, value: string | number) => {
        await updateSettings({
            roomId: room._id,
            sessionId,
            [key]: value,
        })
    }

    const handleStartGame = async () => {
        setIsStarting(true)
        try {
            await startGame({ roomId: room._id, sessionId })
        } finally {
            setIsStarting(false)
        }
    }

    const categories = Object.keys(WORD_CATEGORIES)

    return (
        <div className="min-h-screen p-4 flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/10">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-4xl relative z-10 space-y-6">
                {/* Room Code Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Sala de Lobby</h1>
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-muted-foreground">Código de la sala:</span>
                        <button
                            onClick={copyCode}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/50 rounded-lg hover:bg-primary/30 transition-colors"
                        >
                            <span className="font-mono text-2xl tracking-widest text-primary font-bold">{room.code}</span>
                            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-primary" />}
                        </button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Toca el código para copiar el enlace de invitación</p>
                </motion.div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Players List */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="border-border/50 bg-card/80 backdrop-blur-xl h-full">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Users className="w-5 h-5 text-primary" />
                                    Jugadores ({players.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {players.map((player, index) => (
                                        <motion.div
                                            key={player._id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${player.sessionId === sessionId
                                                    ? "bg-primary/10 border-primary/50"
                                                    : "bg-secondary/30 border-border/50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                                                    {player.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-foreground">{player.name}</span>
                                                        {player.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                                                        {player.sessionId === sessionId && (
                                                            <span className="text-xs text-muted-foreground">(Tú)</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                {player.isHost ? (
                                                    <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded-full">Host</span>
                                                ) : player.isReady ? (
                                                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-full flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> Ready
                                                    </span>
                                                ) : (
                                                    <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">Waiting</span>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Ready Button for non-host players */}
                                {!isHost && currentPlayer && (
                                    <Button
                                        onClick={handleToggleReady}
                                        variant={currentPlayer.isReady ? "outline" : "default"}
                                        className="w-full mt-4"
                                    >
                                        {currentPlayer.isReady ? "Cancelar listo" : "Marcar como listo"}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Game Settings (Host Only) */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="border-border/50 bg-card/80 backdrop-blur-xl h-full">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Settings className="w-5 h-5 text-primary" />
                                    Configuraciones del Juego
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Game Mode */}
                                <div className="space-y-2">
                                    <Label className="text-foreground">Modo de Juego</Label>
                                    <Select
                                        value={room.gameMode}
                                        onValueChange={(value) => handleUpdateSettings("gameMode", value)}
                                        disabled={!isHost}
                                    >
                                        <SelectTrigger className="bg-input border-border">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GAME_MODES.map((mode) => (
                                                <SelectItem key={mode.value} value={mode.value}>
                                                    {mode.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Word Category */}
                                <div className="space-y-2">
                                    <Label className="text-foreground">Categoria de Palabras</Label>
                                    <Select
                                        value={room.category || "Animals"}
                                        onValueChange={(value) => handleUpdateSettings("category", value)}
                                        disabled={!isHost}
                                    >
                                        <SelectTrigger className="bg-input border-border">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Discussion Time */}
                                <div className="space-y-2">
                                    <Label className="text-foreground">Tiempo de Discusión</Label>
                                    <Select
                                        value={room.discussionTime.toString()}
                                        onValueChange={(value) => handleUpdateSettings("discussionTime", Number.parseInt(value))}
                                        disabled={!isHost}
                                    >
                                        <SelectTrigger className="bg-input border-border">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DISCUSSION_TIMES.map((time) => (
                                                <SelectItem key={time.value} value={time.value.toString()}>
                                                    {time.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {!isHost && (
                                    <p className="text-sm text-muted-foreground text-center">Solo el host puede cambiar las configuraciones</p>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Start Game Button (Host Only) */}
                {isHost && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col items-center gap-2"
                    >
                        <Button
                            onClick={handleStartGame}
                            disabled={!canStartResult?.canStart || isStarting}
                            size="lg"
                            className="w-full max-w-md bg-gradient-to-r from-primary to-accent hover:opacity-90"
                        >
                            {isStarting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Iniciando...
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5 mr-2" />
                                    Iniciar Juego
                                </>
                            )}
                        </Button>
                        {!canStartResult?.canStart && canStartResult?.reason && (
                            <p className="text-sm text-muted-foreground">{canStartResult.reason}</p>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    )
}
