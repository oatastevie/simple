"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { checkChromeAI, waitForChromeAI } from "@/lib/ai/check-availability"
import { generateWeek, getRecentWorkoutTypes } from "@/lib/ai/generate-programme"
import { saveProgramme, getNextWeekNumber } from "@/app/actions/programme"
import { createClient } from "@/lib/supabase/client"

type Status =
  | { type: "checking" }
  | { type: "downloading" }
  | { type: "generating"; day: number }
  | { type: "saving" }
  | { type: "error"; message: string }

export default function GeneratingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>({ type: "checking" })

  useEffect(() => {
    let cancelled = false

    async function run() {
      const availability = await checkChromeAI()

      if (availability === "unavailable") {
        setStatus({ type: "error", message: "This app requires Chrome with AI features enabled." })
        return
      }

      if (availability === "downloading") {
        setStatus({ type: "downloading" })
        const result = await waitForChromeAI(() => {
          if (!cancelled) setStatus({ type: "downloading" })
        })
        if (result === "timeout") {
          setStatus({ type: "error", message: "AI model download timed out. Please try again." })
          return
        }
      }

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
        getRecentWorkoutTypes(),
        getNextWeekNumber(user.id),
      ])

      const days = await generateWeek(
        profile,
        weekNumber,
        recentHistory,
        undefined,
        (dayOffset) => {
          if (!cancelled) setStatus({ type: "generating", day: dayOffset + 1 })
        },
      )

      if (cancelled) return

      setStatus({ type: "saving" })
      await saveProgramme(days, weekNumber)

      router.push("/")
    }

    run().catch(err => {
      if (!cancelled) setStatus({ type: "error", message: err?.message ?? "Something went wrong." })
    })

    return () => { cancelled = true }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-4 text-center">
        {status.type === "checking" && (
          <p className="text-muted-foreground">Checking AI availability…</p>
        )}
        {status.type === "downloading" && (
          <>
            <p className="font-medium">Downloading AI model</p>
            <p className="text-sm text-muted-foreground">This only happens once. Please wait.</p>
          </>
        )}
        {status.type === "generating" && (
          <>
            <p className="font-medium">Building your programme</p>
            <p className="text-sm text-muted-foreground">Day {status.day} of 7</p>
            <div className="w-full h-1 bg-muted rounded-full">
              <div
                className="h-1 bg-foreground rounded-full transition-all duration-300"
                style={{ width: `${(status.day / 7) * 100}%` }}
              />
            </div>
          </>
        )}
        {status.type === "saving" && (
          <p className="text-muted-foreground">Saving your programme…</p>
        )}
        {status.type === "error" && (
          <div className="space-y-3">
            <p className="text-destructive text-sm">{status.message}</p>
            {status.message.includes("Chrome") && (
              <a
                href="https://developer.chrome.com/docs/ai/built-in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline"
              >
                Chrome AI requirements →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
