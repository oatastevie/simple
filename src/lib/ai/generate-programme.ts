"use client"

import { WorkoutDaySchema, type GeneratedDay } from "./programme-schema"
import { createClient } from "@/lib/supabase/client"
import type { Tables } from "@/lib/supabase/types"
import { z } from "zod"

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

export function buildWeekPrompt(profile: UserProfile, recentHistory: string[]): string {
  const level = EXPERIENCE_LEVEL[profile.lifting_frequency ?? "Never"] ?? "beginner"
  const areasToAvoid = profile.areas_to_avoid?.filter(a => a !== "None").join(", ") || "none"
  const cardioTypes = profile.cardio_types?.join(", ") || "none"
  const recentLine = recentHistory.length
    ? recentHistory.map(t => `- ${t}`).join("\n")
    : "- none"

  return `You are a personal trainer. Generate a 7-day workout programme as a JSON array.

User profile:
- Goal: ${profile.goal}${profile.secondary_goal ? `, secondary: ${profile.secondary_goal}` : ""}
- Age: ${profile.age}, Sex: ${profile.sex}, Job: ${profile.job_type}
- Lifting: ${profile.lifting_frequency} → level: ${level}
- Cardio: ${profile.cardio_frequency}, types: ${cardioTypes}
- Height: ${profile.height}cm, Weight: ${profile.weight}kg${profile.body_fat_percentage ? `\n- Body fat: ${profile.body_fat_percentage}%` : ""}
- Areas to avoid: ${areasToAvoid}

Recent workouts (most recent first):
${recentLine}

Output a JSON array of exactly 7 objects — one per day, starting from today. Use this exact structure:

[
  {
    "workout_type": "push" | "pull" | "legs" | "full_body" | "cardio" | "rest",
    "exercises": [
      {
        "name": "string",
        "muscle_group": "string",
        "equipment": "string",
        "target_sets": 1–8,
        "target_reps": 1–30,
        "target_weight_kg": 0–999
      }
    ]
  }
]

Rules:
- Omit the exercises field entirely on rest days
- Training days must have at least 3 exercises
- target_weight_kg of 0 means bodyweight
- Respect areas_to_avoid strictly — do not programme exercises that stress those areas
- Avoid repeating the same muscle groups as the recent workouts listed above
- Output only the raw JSON array — no markdown, no explanation, no code fences`
}

const WeekSchema = z.array(WorkoutDaySchema).min(7).max(7)

export type ValidationResult =
  | { ok: true; days: GeneratedDay[] }
  | { ok: false; error: string }

export function validateWeekJson(raw: string): ValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "Not valid JSON — paste the raw array from Claude, no markdown." }
  }

  const result = WeekSchema.safeParse(parsed)
  if (!result.success) {
    const first = result.error.issues[0]
    const path = first.path.length ? ` (${first.path.join(".")})` : ""
    return { ok: false, error: `${first.message}${path}` }
  }

  const days: GeneratedDay[] = result.data.map((day, i) => ({ ...day, day_offset: i }))
  return { ok: true, days }
}
