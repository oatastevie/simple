"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { skipWorkout } from "@/app/actions/programme"

const WORKOUT_LABELS: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  full_body: "Full Body",
  cardio: "Cardio",
  rest: "Rest",
}

type Exercise = {
  id: string
  name: string | null
  target_sets: number | null
  target_reps: number | null
  target_weight_kg: number | null
  completed: boolean | null
  skipped: boolean | null
}

type Props = {
  workoutId: string
  scheduledDate: string
  workoutType: string | null
  completedAt: string | null
  skippedAt: string | null
  exercises: Exercise[]
  lastLoggedWeight: Record<string, number>
  isToday: boolean
  isPast: boolean
  weekday: string
  short: string
}

export default function DayCard({
  workoutId,
  workoutType,
  completedAt,
  skippedAt,
  exercises,
  lastLoggedWeight,
  isToday,
  isPast,
  weekday,
  short,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  const isRest = workoutType === "rest"
  const isSkipped = !!skippedAt
  const canSkip = !isRest && !isSkipped && !completedAt && !isPast

  function handleSkip(shiftFuture: boolean) {
    startTransition(async () => {
      await skipWorkout(workoutId, shiftFuture)
      setConfirming(false)
    })
  }

  return (
    <div className={cn(
      "rounded-2xl border px-5 py-4 transition-colors",
      isToday ? "border-foreground bg-card" : "border-border bg-card",
      isPast && !isToday && "opacity-60",
      isSkipped && "opacity-40",
    )}>
      {/* Day header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", isToday ? "text-foreground" : "text-muted-foreground")}>
            {isToday ? "Today" : weekday}
          </span>
          <span className="text-xs text-muted-foreground">{short}</span>
        </div>
        <div className="flex items-center gap-2">
          {isSkipped && <span className="text-xs text-muted-foreground">Skipped</span>}
          {completedAt && !isSkipped && <span className="text-xs text-muted-foreground">Done</span>}
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            isRest || isSkipped
              ? "bg-muted text-muted-foreground"
              : isToday
                ? "bg-foreground text-background"
                : "bg-muted text-foreground"
          )}>
            {WORKOUT_LABELS[workoutType ?? ""] ?? workoutType}
          </span>
        </div>
      </div>

      {/* Content */}
      {isRest || isSkipped ? (
        <p className="text-sm text-muted-foreground">
          {isSkipped ? "Workout skipped" : "Rest and recover"}
        </p>
      ) : exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exercises</p>
      ) : isToday ? (
        <div className="mt-3 space-y-2">
          {exercises.map(ex => (
            <div key={ex.id} className={cn(
              "flex items-center justify-between text-sm",
              ex.completed && "opacity-50 line-through",
              ex.skipped && "opacity-40",
            )}>
              <span className="font-medium">{ex.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {ex.target_sets}×{ex.target_reps}
                {(() => {
                  const w = lastLoggedWeight[ex.id] ?? ex.target_weight_kg
                  return w ? ` · ${w}kg` : " · BW"
                })()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mt-1 truncate">
          {exercises.map(ex => ex.name).join(" · ")}
        </p>
      )}

      {/* Links */}
      {!isRest && !isSkipped && !completedAt && (
        <div className="mt-3 flex items-center justify-between">
          <Link
            href={`/workout/${workoutId}`}
            className="text-xs font-medium underline underline-offset-2"
          >
            {isToday ? "Start workout →" : "View workout →"}
          </Link>
          {canSkip && !confirming && (
            <button
              className="text-xs text-muted-foreground underline underline-offset-2"
              onClick={() => setConfirming(true)}
            >
              Skip
            </button>
          )}
        </div>
      )}
      {completedAt && !isSkipped && (
        <div className="mt-3">
          <Link href={`/workout/${workoutId}`} className="text-xs text-muted-foreground underline underline-offset-2">
            View →
          </Link>
        </div>
      )}

      {confirming && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <p className="text-sm font-medium">Skip this workout?</p>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              className="w-full"
              disabled={pending}
              onClick={() => handleSkip(true)}
            >
              Skip and bring next workout forward
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => handleSkip(false)}
            >
              Skip only
            </Button>
            <button
              className="text-xs text-muted-foreground"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
