"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { getSessionId } from "../../../../lib/session"
import { LobbyPhase } from "@/components/game/lobby-phase"
import { GameBoard } from "@/components/game/game-board"
import { VotingPhase } from "@/components/game/voting-phase"
import { ResultsPhase } from "@/components/game/results-phase"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"

export default function RoomPage() {
    const params = useParams()
    const router = useRouter()
    const code = params.code as string
    const [sessionId, setSessionId] = useState<string>("")

    useEffect(() => {
        setSessionId(getSessionId())
    }, [])

    const room = useQuery(api.rooms.getRoomByCode, { code: code.toUpperCase() })
    const players = useQuery(api.rooms.getPlayers, room ? { roomId: room._id } : "skip")

    // Loading state
    if (room === undefined || players === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading room...</p>
                </motion.div>
            </div>
        )
    }

    // Room not found
    if (room === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                >
                    <h2 className="text-2xl font-bold text-foreground">Room Not Found</h2>
                    <p className="text-muted-foreground">The room code &quot;{code}&quot; doesn&apos;t exist.</p>
                    <button
                        onClick={() => router.push("/")}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                    >
                        Go Home
                    </button>
                </motion.div>
            </div>
        )
    }

    const currentPlayer = players.find((p: any) => p.sessionId === sessionId)
    const isHost = room.hostId === sessionId

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
