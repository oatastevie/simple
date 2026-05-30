"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { buildSingleDayPrompt, validateDayJson, getRecentWorkoutContext, type DayValidationResult } from "@/lib/ai/generate-programme"
import { replaceDayWorkout } from "@/app/actions/workout"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

type Stage = "request" | "copy" | "paste" | "saving"

export default function RegenerateDayPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [stage, setStage] = useState<Stage>("request")
  const [request, setRequest] = useState("")
  const [prompt, setPrompt] = useState("")
  const [copied, setCopied] = useState(false)
  const [pasted, setPasted] = useState("")
  const [validation, setValidation] = useState<DayValidationResult | null>(null)
  const profileRef = useRef<any>(null)
  const recentRef = useRef<string>("")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
      profileRef.current = profile
      recentRef.current = await getRecentWorkoutContext()
    }
    load()
  }, [router])

  function handleBuildPrompt() {
    if (!profileRef.current) return
    setPrompt(buildSingleDayPrompt(profileRef.current, recentRef.current, request))
    setStage("copy")
    setCopied(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
  }

  function handlePastedChange(value: string) {
    setPasted(value)
    setValidation(value.trim() ? validateDayJson(value.trim()) : null)
  }

  async function handleSave() {
    if (!validation?.ok) return
    setStage("saving")
    const { day } = validation
    await replaceDayWorkout(
      id,
      day.workout_type,
      day.exercises ?? [],
    )
    router.push(`/workout/${id}`)
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-8 pb-8 max-w-lg mx-auto w-full">
      <Link href={`/workout/${id}`} className="text-sm text-muted-foreground mb-6 inline-block">
        ← Back
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mb-1">Regenerate day</h1>
      <p className="text-sm text-muted-foreground mb-6">Describe what you want and get a new prompt to paste into Claude.</p>

      {stage === "request" && (
        <>
          <div className="mb-5">
            <label className="text-xs text-muted-foreground mb-1.5 block">What do you want? <span className="text-muted-foreground/60">(optional)</span></label>
            <Input
              placeholder="e.g. leg day, upper body, something quick, more cardio…"
              value={request}
              onChange={e => setRequest(e.target.value)}
              className="h-12"
              onKeyDown={e => e.key === "Enter" && handleBuildPrompt()}
              autoFocus
            />
          </div>
          <Button className="w-full" onClick={handleBuildPrompt}>
            Build prompt →
          </Button>
        </>
      )}

      {stage === "copy" && (
        <>
          <div className="flex-1 bg-muted rounded-xl p-4 overflow-auto mb-4 max-h-96">
            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{prompt}</pre>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy prompt"}
            </Button>
            {copied && (
              <Button variant="outline" className="flex-1" onClick={() => setStage("paste")}>
                I have Claude's response →
              </Button>
            )}
          </div>
        </>
      )}

      {stage === "paste" && (
        <>
          <button className="text-sm text-muted-foreground mb-4" onClick={() => setStage("copy")}>
            ← Back to prompt
          </button>
          <textarea
            className="flex-1 min-h-48 w-full rounded-xl border border-border bg-card p-4 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-foreground mb-3"
            placeholder={'{\n  "workout_type": "legs",\n  "exercises": [...]\n}'}
            value={pasted}
            onChange={e => handlePastedChange(e.target.value)}
          />

          {validation && (
            <div className={`rounded-xl px-4 py-3 text-sm mb-4 ${validation.ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
              {validation.ok
                ? `✓ Valid — ${validation.day.exercises?.length ?? 0} exercises`
                : `✗ ${validation.error}`}
            </div>
          )}

          <Button className="w-full" disabled={!validation?.ok} onClick={handleSave}>
            Save and replace
          </Button>
        </>
      )}

      {stage === "saving" && (
        <p className="text-muted-foreground">Saving…</p>
      )}
    </div>
  )
}
