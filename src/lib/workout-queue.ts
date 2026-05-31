"use client"

import { logSet, skipExercise } from "@/app/actions/workout"

export type PendingOp =
  | { id: string; type: "logSet"; exerciseId: string; setNumber: number; repsCompleted: number; weightKg: number; notes: string }
  | { id: string; type: "skipExercise"; exerciseId: string; workoutId: string }

function key(workoutId: string) {
  return `workout-queue-${workoutId}`
}

export function loadQueue(workoutId: string): PendingOp[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(key(workoutId))
    return raw ? (JSON.parse(raw) as PendingOp[]) : []
  } catch {
    return []
  }
}

export function saveQueue(workoutId: string, ops: PendingOp[]): void {
  if (typeof window === "undefined") return
  try {
    ops.length
      ? localStorage.setItem(key(workoutId), JSON.stringify(ops))
      : localStorage.removeItem(key(workoutId))
  } catch {}
}

// Flushes as many ops as possible. Removes each successfully processed op from
// localStorage immediately, so concurrent enqueues during a flush are preserved.
export async function flushQueue(workoutId: string, ops: PendingOp[]): Promise<PendingOp[]> {
  const processed = new Set<string>()

  for (const op of ops) {
    try {
      if (op.type === "logSet") {
        await logSet(op.exerciseId, op.setNumber, op.repsCompleted, op.weightKg, op.notes)
      } else if (op.type === "skipExercise") {
        await skipExercise(op.exerciseId, op.workoutId)
      }
      processed.add(op.id)
      // Remove only this op from localStorage — preserve any ops added during the flush
      const current = loadQueue(workoutId)
      saveQueue(workoutId, current.filter(o => !processed.has(o.id)))
    } catch {
      break
    }
  }

  return ops.filter(o => !processed.has(o.id))
}
