"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { redoWorkout } from "@/app/actions/workout"

export default function RedoButton({ pastWorkoutId }: { pastWorkoutId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleRedo() {
    startTransition(async () => {
      const newId = await redoWorkout(pastWorkoutId)
      router.push(`/workout/${newId}`)
    })
  }

  return (
    <button
      className="text-xs font-medium underline underline-offset-2 disabled:opacity-40"
      disabled={pending}
      onClick={handleRedo}
    >
      {pending ? "Setting up…" : "Redo today"}
    </button>
  )
}
