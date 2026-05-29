"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { completeWorkout } from "@/app/actions/workout"

export default function CompleteWorkoutButton({
  workoutId,
  allDone,
}: {
  workoutId: string
  allDone: boolean
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      className="w-full h-12 text-base"
      variant={allDone ? "default" : "outline"}
      disabled={pending}
      onClick={() => startTransition(() => completeWorkout(workoutId))}
    >
      {pending ? "Saving…" : allDone ? "Complete workout" : "Finish early"}
    </Button>
  )
}
