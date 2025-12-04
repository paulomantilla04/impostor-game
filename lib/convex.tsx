"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { type ReactNode, useMemo } from "react"

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || ""

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

let convexClient: ConvexReactClient | null = null

function getConvexClient() {
  if (convexClient) return convexClient
  if (isValidUrl(CONVEX_URL)) {
    convexClient = new ConvexReactClient(CONVEX_URL)
  }
  return convexClient
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => getConvexClient(), [])

  if (!convex) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="text-center max-w-md space-y-4">
          <h2 className="text-2xl font-bold">Convex Setup Required</h2>
          <p className="text-muted-foreground">
            Please configure your Convex URL to play the game. Add NEXT_PUBLIC_CONVEX_URL to your environment variables.
          </p>
          <p className="text-sm text-muted-foreground/70">Current URL: {CONVEX_URL || "(not set)"}</p>
        </div>
      </div>
    )
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
