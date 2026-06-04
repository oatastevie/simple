"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { buildProgressPrompt, getProgressContext } from "@/lib/ai/generate-programme"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type Stage = "loading" | "copy" | "paste"

export default function ProgressPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("loading")
  const [prompt, setPrompt] = useState("")
  const [copied, setCopied] = useState(false)
  const [response, setResponse] = useState("")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
      if (!profile) { router.push("/onboarding"); return }
      const context = await getProgressContext()
      setPrompt(buildProgressPrompt(profile, context))
      setStage("copy")
    }
    load()
  }, [router])

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-8 pb-8 max-w-lg mx-auto w-full">
      <Link href="/" className="text-sm text-muted-foreground mb-6 inline-block">
        ← Home
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mb-1">Progress review</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Copy this prompt into Claude to get a full evaluation of your training so far.
      </p>

      {stage === "loading" && (
        <p className="text-sm text-muted-foreground">Building your summary…</p>
      )}

      {stage === "copy" && (
        <>
          <div className="flex-1 bg-muted rounded-xl p-4 overflow-auto mb-4 max-h-[50vh]">
            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{prompt}</pre>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy prompt"}
            </Button>
            {copied && (
              <Button variant="outline" className="flex-1" onClick={() => setStage("paste")}>
                Paste Claude's response →
              </Button>
            )}
          </div>
        </>
      )}

      {stage === "paste" && (
        <>
          <button className="text-sm text-muted-foreground mb-4 text-left" onClick={() => setStage("copy")}>
            ← Back to prompt
          </button>

          {!response ? (
            <>
              <textarea
                className="flex-1 min-h-64 w-full rounded-xl border border-border bg-card p-4 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-foreground mb-3"
                placeholder="Paste Claude's evaluation here…"
                value={response}
                onChange={e => setResponse(e.target.value)}
                autoFocus
              />
            </>
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="rounded-xl border border-border bg-card p-4 text-sm whitespace-pre-wrap leading-relaxed mb-4">
                {response}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setResponse("")}>
                Edit response
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
