"use client"

import { WorkoutDaySchema, workoutDayJsonSchema, type GeneratedDay } from "./programme-schema"
import { createClient } from "@/lib/supabase/client"
import type { Tables } from "@/lib/supabase/types"

type UserProfile = Tables<"users">

const EXPERIENCE_LEVEL: Record<string, string> = {
  "Never": "beginner",
  "1-2x week": "beginner",
  "3-4x week": "intermediate",
  "5x+ week": "advanced",
}

export async function getRecentWorkoutTypes(): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("workouts")
    .select("workout_type, scheduled_date")
    .lt("scheduled_date", new Date().toISOString().split("T")[0])
    .order("scheduled_date", { ascending: false })
    .limit(3)
  return (data ?? []).map(w => w.workout_type ?? "rest").filter(Boolean)
}

function buildDayPrompt(
  profile: UserProfile,
  dayOffset: number,
  weekNumber: number,
  recentContext: string[],
  adaptationSummary?: string,
): string {
  const level = EXPERIENCE_LEVEL[profile.lifting_frequency ?? "Never"] ?? "beginner"
  const areasToAvoid = profile.areas_to_avoid?.join(", ") || "none"
  const cardioTypes = profile.cardio_types?.join(", ") || "none"
  const recentLine = recentContext.length
    ? recentContext.map(t => `- ${t}`).join("\n")
    : "- none yet"
  const adaptLine = weekNumber > 1 && dayOffset === 0 && adaptationSummary
    ? `\nPrevious week performance:\n${adaptationSummary}`
    : ""

  return `Generate day ${dayOffset + 1} of 7 (week ${weekNumber}):
Goal: ${profile.goal}${profile.secondary_goal ? `, secondary: ${profile.secondary_goal}` : ""}
Age: ${profile.age}, Sex: ${profile.sex}, Job: ${profile.job_type}
Lifting: ${profile.lifting_frequency} → level: ${level}
Cardio: ${profile.cardio_frequency}, types: ${cardioTypes}
Height: ${profile.height}cm, Weight: ${profile.weight}kg
${profile.body_fat_percentage ? `Body fat: ${profile.body_fat_percentage}%` : ""}
Areas to avoid: ${areasToAvoid}

Recent sessions (most recent first):
${recentLine}
${adaptLine}`
}

const SYSTEM_PROMPT = `You are a personal trainer AI. Generate ONE day's workout as JSON.
Equipment: full gym. Output only valid JSON matching the schema.
Rules:
- Rest days: workout_type "rest", no exercises field
- Training days: at least 3 exercises
- Weight 0 means bodyweight
- Respect areas_to_avoid strictly
- Avoid training the same muscle groups as the recent sessions listed`

export async function generateDay(
  profile: UserProfile,
  dayOffset: number,
  weekNumber: number,
  recentContext: string[],
  adaptationSummary?: string,
): Promise<GeneratedDay> {
  const prompt = buildDayPrompt(profile, dayOffset, weekNumber, recentContext, adaptationSummary)

  for (let attempt = 0; attempt < 2; attempt++) {
    let session: any = null
    try {
      session = await (globalThis as any).ai.languageModel.create({
        systemPrompt: SYSTEM_PROMPT,
        responseConstraint: workoutDayJsonSchema,
      })
      const hint = attempt > 0
        ? "Previous attempt produced invalid output. Retry strictly following the schema.\n\n"
        : ""
      const raw = await session.prompt(hint + prompt)
      const parsed = JSON.parse(raw)
      const validated = WorkoutDaySchema.parse(parsed)
      return { ...validated, day_offset: dayOffset }
    } catch {
      // fall through to next attempt or rest day fallback
    } finally {
      session?.destroy()
    }
  }

  return { workout_type: "rest", day_offset: dayOffset }
}

export async function generateWeek(
  profile: UserProfile,
  weekNumber: number,
  recentHistory: string[],
  adaptationSummary?: string,
  onDayComplete?: (dayOffset: number) => void,
): Promise<GeneratedDay[]> {
  const days: GeneratedDay[] = []

  for (let offset = 0; offset < 7; offset++) {
    const generatedTypes = days.map(d => d.workout_type)
    const context = [...recentHistory, ...generatedTypes].slice(-3)

    const day = await generateDay(profile, offset, weekNumber, context, adaptationSummary)
    days.push(day)
    onDayComplete?.(offset)
  }

  return days
}
