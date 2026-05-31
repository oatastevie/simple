"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import ExerciseCard from "@/app/components/ExerciseCard"
import CompleteWorkoutButton from "@/app/components/CompleteWorkoutButton"
import { loadQueue, saveQueue, flushQueue, type PendingOp } from "@/lib/workout-queue"
import { completeWorkout } from "@/app/actions/workout"
import type { PreviousSet } from "./page"

export type InitialExercise = {
  id: string
  name: string | null
  muscle_group: string | null
  equipment: string | null
  target_sets: number | null
  target_reps: number | null
  target_weight_kg: number | null
  completed: boolean | null
  skipped: boolean | null
}

export type InitialSet = {
  id: string
  set_number: number | null
  reps_completed: number | null
  weight_kg: number | null
  notes: string | null
}

type Props = {
  workoutId: string
  label: string
  dateLabel: string
  alreadyCompleted: boolean
  exercises: InitialExercise[]
  setsMap: Record<string, InitialSet[]>
  previousSetsByName: Record<string, PreviousSet[]>
}

export default function WorkoutClient({
  workoutId,
  label,
  dateLabel,
  alreadyCompleted,
  exercises,
  setsMap: initialSetsMap,
  previousSetsByName,
}: Props) {
  const [setsMap, setSetsMap] = useState<Record<string, InitialSet[]>>(() => initialSetsMap)
  const [skipped, setSkipped] = useState<Set<string>>(() =>
    new Set(exercises.filter(e => e.skipped).map(e => e.id))
  )
  const [completed, setCompleted] = useState<Set<string>>(() =>
    new Set(exercises.filter(e => e.completed).map(e => e.id))
  )

  const queueRef = useRef<PendingOp[]>(loadQueue(workoutId))
  const [pendingCount, setPendingCount] = useState(() => loadQueue(workoutId).length)
  const [syncing, setSyncing] = useState(false)
  const [completeError, setCompleteError] = useState("")
  const flushingRef = useRef(false)

  function enqueue(op: PendingOp) {
    queueRef.current = [...queueRef.current, op]
    saveQueue(workoutId, queueRef.current)
    setPendingCount(queueRef.current.length)
  }

  const tryFlush = useCallback(async () => {
    if (flushingRef.current || queueRef.current.length === 0) return
    flushingRef.current = true
    setSyncing(true)
    const remaining = await flushQueue(workoutId, queueRef.current)
    queueRef.current = remaining
    setPendingCount(remaining.length)
    setSyncing(false)
    flushingRef.current = false
  }, [workoutId])

  // Flush on mount (pick up any ops from a previous session) and on reconnect
  useEffect(() => {
    if (navigator.onLine) tryFlush()
    const handleOnline = () => tryFlush()
    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [tryFlush])

  // Periodic flush every 30s while there are pending ops
  useEffect(() => {
    if (pendingCount === 0) return
    const t = setInterval(() => {
      if (navigator.onLine) tryFlush()
    }, 30_000)
    return () => clearInterval(t)
  }, [pendingCount, tryFlush])

  function handleLogSet(exerciseId: string, setNumber: number, reps: number, weight: number, notes: string) {
    const newSet: InitialSet = {
      id: crypto.randomUUID(),
      set_number: setNumber,
      reps_completed: reps,
      weight_kg: weight,
      notes: notes || null,
    }

    setSetsMap(prev => ({ ...prev, [exerciseId]: [...(prev[exerciseId] ?? []), newSet] }))

    const exercise = exercises.find(e => e.id === exerciseId)
    if (exercise && setNumber >= (exercise.target_sets ?? 0)) {
      setCompleted(prev => new Set([...prev, exerciseId]))
    }

    enqueue({
      id: crypto.randomUUID(),
      type: "logSet",
      exerciseId,
      setNumber,
      repsCompleted: reps,
      weightKg: weight,
      notes,
    })

    if (navigator.onLine) tryFlush()
  }

  function handleSkip(exerciseId: string) {
    setSkipped(prev => new Set([...prev, exerciseId]))
    enqueue({ id: crypto.randomUUID(), type: "skipExercise", exerciseId, workoutId })
    if (navigator.onLine) tryFlush()
  }

  async function handleComplete() {
    setCompleteError("")

    // Wait for any in-progress background flush
    while (flushingRef.current) {
      await new Promise(r => setTimeout(r, 100))
    }

    if (queueRef.current.length > 0) {
      flushingRef.current = true
      setSyncing(true)
      const remaining = await flushQueue(workoutId, queueRef.current)
      queueRef.current = remaining
      setPendingCount(remaining.length)
      setSyncing(false)
      flushingRef.current = false

      if (remaining.length > 0) {
        setCompleteError("Can't complete workout while offline — connect and try again.")
        return
      }
    }

    await completeWorkout(workoutId)
  }

  const allDone = exercises.every(e =>
    completed.has(e.id) ||
    skipped.has(e.id) ||
    (setsMap[e.id]?.length ?? 0) >= (e.target_sets ?? 0)
  )

  return (
    <div className="min-h-screen px-4 pt-8 pb-24 max-w-lg mx-auto w-full">
      <Link href="/" className="text-sm text-muted-foreground mb-6 inline-block">
        ← Home
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-semibold tracking-tight">{label} day</h1>
          {alreadyCompleted && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Done</span>
          )}
          {pendingCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {syncing ? "Syncing…" : `${pendingCount} unsaved`}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </div>

      <div className="space-y-3">
        {exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            exerciseId={ex.id}
            name={ex.name ?? ""}
            muscleGroup={ex.muscle_group}
            equipment={ex.equipment}
            targetSets={ex.target_sets ?? 0}
            targetReps={ex.target_reps ?? 0}
            targetWeightKg={ex.target_weight_kg ?? 0}
            completed={completed.has(ex.id) || (setsMap[ex.id]?.length ?? 0) >= (ex.target_sets ?? 0)}
            skipped={skipped.has(ex.id)}
            loggedSets={setsMap[ex.id] ?? []}
            previousSets={(previousSetsByName[ex.name ?? ""] ?? []).slice(0, 2)}
            onLogSet={(setNumber, reps, weight, notes) => handleLogSet(ex.id, setNumber, reps, weight, notes)}
            onSkip={() => handleSkip(ex.id)}
          />
        ))}
      </div>

      {!alreadyCompleted && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-background/80 backdrop-blur max-w-lg mx-auto">
          {completeError && (
            <p className="text-xs text-destructive text-center mb-2">{completeError}</p>
          )}
          <CompleteWorkoutButton allDone={allDone} onComplete={handleComplete} syncing={syncing} />
        </div>
      )}
    </div>
  )
}
