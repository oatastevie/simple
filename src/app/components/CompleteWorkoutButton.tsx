"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function CompleteWorkoutButton({
  allDone,
  syncing,
  onComplete,
}: {
  allDone: boolean
  syncing: boolean
  onComplete: () => Promise<void>
}) {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    await onComplete()
    setPending(false)
  }

  const busy = pending || syncing

  return (
    <Button
      className="w-full h-12 text-base"
      variant={allDone ? "default" : "outline"}
      disabled={busy}
      onClick={handleClick}
    >
      {pending ? "Saving…" : allDone ? "Complete workout" : "Finish early"}
    </Button>
  )
}
