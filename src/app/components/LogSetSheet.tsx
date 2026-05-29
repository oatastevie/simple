"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { logSet } from "@/app/actions/workout"

type Props = {
  exerciseId: string
  exerciseName: string
  setNumber: number
  targetReps: number
  targetWeightKg: number
  isBodyweight: boolean
  onClose: () => void
  onLogged: () => void
}

export default function LogSetSheet({
  exerciseId,
  exerciseName,
  setNumber,
  targetReps,
  targetWeightKg,
  isBodyweight,
  onClose,
  onLogged,
}: Props) {
  const [reps, setReps] = useState(String(targetReps))
  const [weight, setWeight] = useState(String(targetWeightKg))
  const [notes, setNotes] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  function handleConfirm() {
    const r = parseInt(reps) || 0
    const w = parseFloat(weight) || 0
    if (r <= 0) return
    startTransition(async () => {
      await logSet(exerciseId, setNumber, r, w, notes)
      onLogged()
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl px-5 pt-5 pb-10 max-w-lg mx-auto shadow-xl">
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />

        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Set {setNumber}</p>
        <h2 className="text-lg font-semibold mb-5">{exerciseName}</h2>

        {/* Reps + weight */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Reps</label>
            <Input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className="h-14 text-2xl text-center"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {isBodyweight ? "Added weight (kg)" : "Weight (kg)"}
            </label>
            <Input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="h-14 text-2xl text-center"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
          <Input
            type="text"
            placeholder="e.g. felt heavy, paused reps…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="h-11"
          />
        </div>

        <Button
          className="w-full h-12 text-base"
          disabled={pending || !reps || parseInt(reps) <= 0}
          onClick={handleConfirm}
        >
          {pending ? "Saving…" : "Log set"}
        </Button>
      </div>
    </>
  )
}
