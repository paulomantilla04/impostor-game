"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { HomeScreen } from "@/components/game/home-screen"
import { getSessionId } from "@/lib/session"

export default function HomePage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string>("")

  const createRoomMutation = useMutation(api.rooms.createRoom)
  const joinRoomMutation = useMutation(api.rooms.joinRoom)

  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  const handleCreateRoom = useCallback(
    async (hostName: string) => {
      const sid = getSessionId()
      const result = await createRoomMutation({ hostName, sessionId: sid })
      router.push(`/room/${result.code}`)
      return result
    },
    [createRoomMutation, router],
  )

  const handleJoinRoom = useCallback(
    async (playerName: string, roomCode: string) => {
      const sid = getSessionId()
      const result = await joinRoomMutation({
        playerName,
        roomCode: roomCode.toUpperCase(),
        sessionId: sid,
      })
      router.push(`/room/${roomCode.toUpperCase()}`)
      return result
    },
    [joinRoomMutation, router],
  )

  return <HomeScreen onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
}
