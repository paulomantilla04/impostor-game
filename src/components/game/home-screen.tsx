"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, Users, Plus, LogIn, Loader2 } from "lucide-react"

interface HomeScreenProps {
  onCreateRoom: (hostName: string) => Promise<{ roomId: string; code: string }>
  onJoinRoom: (playerName: string, roomCode: string) => Promise<{ roomId: string }>
}

export function HomeScreen({ onCreateRoom, onJoinRoom }: HomeScreenProps) {
  const [hostName, setHostName] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!hostName.trim()) {
      setError("Please enter your name")
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await onCreateRoom(hostName.trim())
    } catch (err: any) {
      setError(err.message || "Failed to create room")
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name")
      return
    }
    if (!roomCode.trim()) {
      setError("Please enter room code")
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await onJoinRoom(playerName.trim(), roomCode.trim().toUpperCase())
    } catch (err: any) {
      setError(err.message || "Failed to join room")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg pulse-glow">
                <Eye className="w-10 h-10 text-primary-foreground" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl font-bold text-balance bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Impostor
            </CardTitle>
            <CardDescription className="text-muted-foreground">Find the impostor before they blend in</CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50">
                <TabsTrigger
                  value="create"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Room
                </TabsTrigger>
                <TabsTrigger
                  value="join"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Join Room
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="hostName" className="text-foreground">
                      Your Name
                    </Label>
                    <Input
                      id="hostName"
                      placeholder="Enter your name..."
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      className="bg-input border-border focus:border-primary"
                      maxLength={20}
                    />
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-medium"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Create Room
                      </>
                    )}
                  </Button>
                </motion.div>
              </TabsContent>

              <TabsContent value="join">
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="playerName" className="text-foreground">
                      Your Name
                    </Label>
                    <Input
                      id="playerName"
                      placeholder="Enter your name..."
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="bg-input border-border focus:border-primary"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roomCode" className="text-foreground">
                      Room Code
                    </Label>
                    <Input
                      id="roomCode"
                      placeholder="Enter room code..."
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="bg-input border-border focus:border-primary uppercase font-mono tracking-widest text-center text-lg"
                      maxLength={6}
                    />
                  </div>
                  <Button
                    onClick={handleJoin}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 text-accent-foreground font-medium"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Join Room
                      </>
                    )}
                  </Button>
                </motion.div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">3-10 players needed to start a game</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
