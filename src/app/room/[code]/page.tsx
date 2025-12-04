"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react" // Importar useMutation
import { api } from "../../../../convex/_generated/api"
import { getSessionId } from "../../../../lib/session"
import { LobbyPhase } from "@/components/game/lobby-phase"
import { GameBoard } from "@/components/game/game-board"
import { VotingPhase } from "@/components/game/voting-phase"
import { ResultsPhase } from "@/components/game/results-phase"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, LogIn } from "lucide-react" // Importar LogIn
// Importar componentes de UI necesarios para el formulario de unirse
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function RoomPage() {
    const params = useParams()
    const router = useRouter()
    const code = params.code as string
    const [sessionId, setSessionId] = useState<string>("")
    
    // Estados para el formulario de unirse
    const [joinName, setJoinName] = useState("")
    const [isJoining, setIsJoining] = useState(false)
    const [joinError, setJoinError] = useState<string | null>(null)

    const joinRoomMutation = useMutation(api.rooms.joinRoom) // Mutation para unirse

    useEffect(() => {
        setSessionId(getSessionId())
    }, [])

    const room = useQuery(api.rooms.getRoomByCode, { code: code?.toUpperCase() })
    // Nota: Pasamos "skip" si no hay room para evitar errores, igual que antes
    const players = useQuery(api.rooms.getPlayers, room ? { roomId: room._id } : "skip")

    const handleJoinGame = async () => {
        if (!joinName.trim()) {
            setJoinError("Por favor ingresa tu nombre")
            return
        }
        setIsJoining(true)
        setJoinError(null)
        try {
            await joinRoomMutation({
                playerName: joinName.trim(),
                roomCode: code.toUpperCase(),
                sessionId: sessionId
            })
            // Una vez unido, Convex actualizará automáticamente la lista de 'players'
            // y el componente se re-renderizará mostrando el juego.
        } catch (error: any) {
            setJoinError(error.message || "Error al unirse a la sala")
        } finally {
            setIsJoining(false)
        }
    }

    // 1. Loading state
    if (room === undefined || players === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Cargando sala...</p>
                </motion.div>
            </div>
        )
    }

    // 2. Room not found
    if (room === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                >
                    <h2 className="text-2xl font-bold text-foreground">Sala no encontrada</h2>
                    <p className="text-muted-foreground">El código &quot;{code}&quot; no existe.</p>
                    <button
                        onClick={() => router.push("/")}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                    >
                        Volver al Inicio
                    </button>
                </motion.div>
            </div>
        )
    }

    const currentPlayer = players.find((p: any) => p.sessionId === sessionId)
    const isHost = room.hostId === sessionId

    // 3. NUEVO: Si la sala existe pero el jugador NO está unido, mostramos formulario de ingreso
    if (!currentPlayer) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold">Unirse a la Sala</CardTitle>
                            <CardDescription>Estás entrando a la sala <span className="font-mono font-bold text-primary">{room.code}</span></CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {joinError && (
                                <Alert variant="destructive">
                                    <AlertDescription>{joinError}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="joinName">Tu Nombre</Label>
                                <Input 
                                    id="joinName"
                                    placeholder="Escribe tu nombre..."
                                    value={joinName}
                                    onChange={(e) => setJoinName(e.target.value)}
                                    maxLength={20}
                                    onKeyDown={(e) => e.key === "Enter" && handleJoinGame()}
                                />
                            </div>
                            <Button 
                                onClick={handleJoinGame} 
                                disabled={isJoining}
                                className="w-full bg-gradient-to-r from-primary to-accent"
                                size="lg"
                            >
                                {isJoining ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4 mr-2" />
                                        Unirse al Juego
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        )
    }

    // 4. Si el jugador ya existe, mostramos el estado del juego (Lobby, Playing, etc.)
    return (
        <div className="min-h-screen bg-background">
            <AnimatePresence mode="wait">
                {room.status === "waiting" && (
                    <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <LobbyPhase
                            room={room}
                            players={players}
                            sessionId={sessionId}
                            isHost={isHost}
                            currentPlayer={currentPlayer}
                        />
                    </motion.div>
                )}

                {room.status === "playing" && (
                    <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <GameBoard
                            room={room}
                            players={players}
                            sessionId={sessionId}
                            isHost={isHost}
                            currentPlayer={currentPlayer}
                        />
                    </motion.div>
                )}

                {room.status === "voting" && (
                    <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <VotingPhase
                            room={room}
                            players={players}
                            sessionId={sessionId}
                            isHost={isHost}
                            currentPlayer={currentPlayer}
                        />
                    </motion.div>
                )}

                {room.status === "results" && (
                    <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <ResultsPhase room={room} players={players} sessionId={sessionId} isHost={isHost} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}