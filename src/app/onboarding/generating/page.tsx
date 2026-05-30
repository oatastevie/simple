"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { buildWeekPrompt, getRecentWorkoutContext, validateWeekJson, type ValidationResult } from "@/lib/ai/generate-programme"
import { saveProgramme, getNextWeekNumber } from "@/app/actions/programme"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import type { Tables } from "@/lib/supabase/types"

type Stage = "loading" | "copy" | "paste" | "saving" | "error"

export default function GeneratingPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("loading")
  const [prompt, setPrompt] = useState("")
  const [copied, setCopied] = useState(false)
  const [pasted, setPasted] = useState("")
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const profileRef = useRef<Tables<"users"> | null>(null)
  const weekNumberRef = useRef(1)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single()

      if (!profile) { router.push("/onboarding"); return }

      const [recentHistory, weekNumber] = await Promise.all([
        getRecentWorkoutContext(),
        getNextWeekNumber(user.id),
      ])

      profileRef.current = profile
      weekNumberRef.current = weekNumber
      setPrompt(buildWeekPrompt(profile, recentHistory))
      setStage("copy")
    }

    init().catch(err => {
      setErrorMsg(err?.message ?? "Something went wrong")
      setStage("error")
    })
  }, [router])

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
  }

  function handlePastedChange(value: string) {
    setPasted(value)
    if (value.trim()) {
      setValidation(validateWeekJson(value.trim()))
    } else {
      setValidation(null)
    }
  }

  async function handleSave() {
    if (!validation?.ok) return
    setStage("saving")
    try {
      await saveProgramme(validation.days, weekNumberRef.current)
      router.push("/")
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to save")
      setStage("error")
    }
  }

  if (stage === "loading") {
    return <Centered><p className="text-muted-foreground">Loading your profile…</p></Centered>
  }

  if (stage === "saving") {
    return <Centered><p className="text-muted-foreground">Saving your programme…</p></Centered>
  }

  if (stage === "error") {
    return (
      <Centered>
        <p className="text-destructive text-sm">{errorMsg}</p>
        <Button variant="outline" onClick={() => router.push("/onboarding/generating")} className="mt-4">
          Try again
        </Button>
      </Centered>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-8 pb-8 max-w-lg mx-auto w-full">
      {stage === "copy" && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Generate your programme</h1>
            <p className="text-sm text-muted-foreground">
              Copy this prompt, paste it into{" "}
              <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="underline">
                Claude
              </a>
              , then come back and paste the response.
            </p>
          </div>

          <div className="flex-1 bg-muted rounded-xl p-4 overflow-auto mb-4">
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
          <div className="mb-6">
            <button
              className="text-sm text-muted-foreground mb-3 flex items-center gap-1"
              onClick={() => setStage("copy")}
            >
              ← Back to prompt
            </button>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Paste Claude's response</h1>
            <p className="text-sm text-muted-foreground">Paste the raw JSON array Claude gave you.</p>
          </div>

          <textarea
            className="flex-1 min-h-48 w-full rounded-xl border border-border bg-card p-4 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-foreground"
            placeholder={'[\n  { "workout_type": "push", "exercises": [...] },\n  ...\n]'}
            value={pasted}
            onChange={e => handlePastedChange(e.target.value)}
          />

          {validation && (
            <div className={`mt-3 rounded-xl px-4 py-3 text-sm ${validation.ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
              {validation.ok
                ? `✓ Valid — ${validation.days.filter(d => d.workout_type !== "rest").length} training days, ${validation.days.filter(d => d.workout_type === "rest").length} rest days`
                : `✗ ${validation.error}`
              }
            </div>
          )}

          <Button
            className="mt-4 w-full"
            disabled={!validation?.ok}
            onClick={handleSave}
          >
            Save programme
          </Button>
        </>
      )}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-2">{children}</div>
    </div>
  )
}
