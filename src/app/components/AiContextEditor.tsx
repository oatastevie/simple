"use client"

import { useState } from "react"
import { saveAiContext } from "@/app/actions/user"
import { Button } from "@/components/ui/button"

export default function AiContextEditor({ initialValue }: { initialValue: string | null }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue ?? "")
  const [saved, setSaved] = useState(initialValue ?? "")
  const [pending, setPending] = useState(false)

  async function handleSave() {
    setPending(true)
    await saveAiContext(value)
    setSaved(value)
    setPending(false)
    setEditing(false)
  }

  function handleCancel() {
    setValue(saved)
    setEditing(false)
  }

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-medium">Notes for your trainer</span>
        <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {editing ? (
            <>
              <textarea
                className="w-full min-h-[96px] rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. I only have dumbbells at home. I prefer higher reps. Skip barbell movements."
                value={value}
                onChange={e => setValue(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" disabled={pending} onClick={handleSave}>
                  {pending ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="outline" disabled={pending} onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div
              className="text-sm text-muted-foreground cursor-pointer min-h-[40px]"
              onClick={() => setEditing(true)}
            >
              {saved
                ? <p className="whitespace-pre-wrap">{saved}</p>
                : <p className="italic">Tap to add notes — e.g. equipment you have, exercises to avoid, preferences…</p>
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}
