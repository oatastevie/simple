"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { skipExercise } from "@/app/actions/workout"
import LogSetSheet from "./LogSetSheet"

type LoggedSet = {
  id: string
  set_number: number | null
  reps_completed: number | null
  weight_kg: number | null
  notes: string | null
}

type Props = {
  workoutId: string
  exerciseId: string
  name: string
  muscleGroup: string | null
  equipment: string | null
  targetSets: number
  targetReps: number
  targetWeightKg: number
  completed: boolean
  skipped: boolean
  loggedSets: LoggedSet[]
}

export default function ExerciseCard({
  workoutId,
  exerciseId,
  name,
  muscleGroup,
  targetSets,
  targetReps,
  targetWeightKg,
  completed,
  skipped,
  loggedSets,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [skipConfirm, setSkipConfirm] = useState(false)

  const isBodyweight = targetWeightKg === 0
  const nextSetNumber = (loggedSets.length) + 1
  const allSetsLogged = loggedSets.length >= targetSets

  function handleLogged() {
    setSheetOpen(false)
  }

  function handleSkip() {
    skipExercise(exerciseId, workoutId)
    setSkipConfirm(false)
  }

  if (skipped) {
    return (
      <div className="rounded-2xl border border-border bg-card px-5 py-4 opacity-40">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium line-through">{name}</span>
          <span className="text-xs text-muted-foreground">Skipped</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border bg-card px-5 py-4 transition-colors",
          completed ? "border-border opacity-60" : "border-border",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-medium text-sm">{name}</p>
            {muscleGroup && (
              <p className="text-xs text-muted-foreground mt-0.5">{muscleGroup}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {targetSets}×{targetReps}
            {!isBodyweight && ` · ${targetWeightKg}kg`}
          </span>
        </div>

        {/* Set dots */}
        <div className="flex gap-2 mb-4">
          {Array.from({ length: targetSets }).map((_, i) => {
            const logged = loggedSets[i]
            return (
              <div
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full",
                  logged ? "bg-foreground" : "bg-muted"
                )}
              />
            )
          })}
        </div>

        {/* Logged sets */}
        {loggedSets.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {loggedSets.map(s => (
              <div key={s.id} className="text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Set {s.set_number}</span>
                  <span className="tabular-nums">
                    {s.reps_completed} reps
                    {s.weight_kg ? ` · ${s.weight_kg}kg` : ""}
                  </span>
                </div>
                {s.notes && (
                  <p className="text-muted-foreground/70 mt-0.5 italic">{s.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {!completed && !allSetsLogged && (
          <div className="flex gap-2">
            <button
              className="flex-1 h-10 rounded-xl bg-foreground text-background text-sm font-medium"
              onClick={() => setSheetOpen(true)}
            >
              Log set {nextSetNumber}
            </button>
            {!skipConfirm ? (
              <button
                className="h-10 px-4 rounded-xl border border-border text-sm text-muted-foreground"
                onClick={() => setSkipConfirm(true)}
              >
                Skip
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  className="h-10 px-3 rounded-xl bg-destructive text-destructive-foreground text-xs font-medium"
                  onClick={handleSkip}
                >
                  Confirm
                </button>
                <button
                  className="h-10 px-3 rounded-xl border border-border text-xs"
                  onClick={() => setSkipConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {(completed || allSetsLogged) && (
          <p className="text-xs text-muted-foreground">All sets done</p>
        )}
      </div>

      {sheetOpen && (
        <LogSetSheet
          exerciseId={exerciseId}
          exerciseName={name}
          setNumber={nextSetNumber}
          targetReps={targetReps}
          targetWeightKg={targetWeightKg}
          isBodyweight={isBodyweight}
          onClose={() => setSheetOpen(false)}
          onLogged={handleLogged}
        />
      )}
    </>
  )
}
