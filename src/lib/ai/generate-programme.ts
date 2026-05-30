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

// Builds a rich recent-workout context string including exercises, sets, weights, and notes.
export async function getRecentWorkoutContext(): Promise<string> {
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, workout_type, scheduled_date")
    .lt("scheduled_date", today)
    .not("completed_at", "is", null)
    .order("scheduled_date", { ascending: false })
    .limit(3)

  if (!workouts?.length) return "- none"

  const workoutIds = workouts.map(w => w.id)

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, workout_id, name, target_sets, target_reps, target_weight_kg")
    .in("workout_id", workoutIds)
    .order("order_index", { ascending: true })

  const exerciseIds = (exercises ?? []).map(e => e.id)

  const { data: sets } = exerciseIds.length
    ? await supabase
        .from("sets")
        .select("exercise_id, set_number, reps_completed, weight_kg, notes")
        .in("exercise_id", exerciseIds)
        .order("set_number", { ascending: true })
    : { data: [] }

  type SetRow = NonNullable<typeof sets>[number]
  const setsByExercise = (sets ?? []).reduce<Record<string, SetRow[]>>((acc, s) => {
    if (!s.exercise_id) return acc
    acc[s.exercise_id] = acc[s.exercise_id] ?? []
    acc[s.exercise_id]!.push(s)
    return acc
  }, {})

  type ExRow = NonNullable<typeof exercises>[number]
  const exercisesByWorkout = (exercises ?? []).reduce<Record<string, ExRow[]>>((acc, ex) => {
    if (!ex.workout_id) return acc
    acc[ex.workout_id] = acc[ex.workout_id] ?? []
    acc[ex.workout_id]!.push(ex)
    return acc
  }, {})

  return workouts.map(w => {
    const date = new Date((w.scheduled_date ?? "") + "T00:00:00Z")
      .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    const exs = exercisesByWorkout[w.id] ?? []

    const exerciseLines = exs.map(ex => {
      const logged = setsByExercise[ex.id] ?? []
      if (!logged.length) return `  ${ex.name} — no sets logged`

      const setStrs = logged.map(s => {
        const reps = s.reps_completed ?? "?"
        const weight = s.weight_kg ? `@${s.weight_kg}kg` : "BW"
        const note = s.notes ? ` ("${s.notes}")` : ""
        return `${reps}${weight}${note}`
      })
      return `  ${ex.name}: ${setStrs.join(", ")}`
    })

    return `${w.workout_type} · ${date}\n${exerciseLines.join("\n")}`
  }).join("\n\n")
}

export function buildWeekPrompt(profile: UserProfile, recentContext: string): string {
  const level = EXPERIENCE_LEVEL[profile.lifting_frequency ?? "Never"] ?? "beginner"
  const areasToAvoid = profile.areas_to_avoid?.filter(a => a !== "None").join(", ") || "none"

  return `You are a personal trainer. Generate a 7-day workout programme as a JSON array.

User profile:
- Goal: ${profile.goal}${profile.secondary_goal ? `, secondary: ${profile.secondary_goal}` : ""}
- Age: ${profile.age}, Sex: ${profile.sex}, Job: ${profile.job_type}
- Lifting: ${profile.lifting_frequency} → level: ${level}
- Height: ${profile.height}cm, Weight: ${profile.weight}kg${profile.body_fat_percentage ? `\n- Body fat: ${profile.body_fat_percentage}%` : ""}
- Areas to avoid: ${areasToAvoid}

Recent workouts (most recent first):
${recentContext}

Output a JSON array of exactly 7 objects — one per day, starting from today. Use this exact structure:

[
  {
    "workout_type": "push" | "pull" | "legs" | "rest",
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
- Use recent workout data to inform appropriate weights and avoid repeating muscle groups
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

export function buildSingleDayPrompt(
  profile: UserProfile,
  recentContext: string,
  request: string,
): string {
  const level = EXPERIENCE_LEVEL[profile.lifting_frequency ?? "Never"] ?? "beginner"
  const areasToAvoid = profile.areas_to_avoid?.filter(a => a !== "None").join(", ") || "none"

  return `You are a personal trainer. Generate ONE workout day as a JSON object.

User profile:
- Goal: ${profile.goal}${profile.secondary_goal ? `, secondary: ${profile.secondary_goal}` : ""}
- Age: ${profile.age}, Sex: ${profile.sex}
- Lifting: ${profile.lifting_frequency} → level: ${level}
- Height: ${profile.height}cm, Weight: ${profile.weight}kg
- Areas to avoid: ${areasToAvoid}

Recent workouts (most recent first):
${recentContext}

Special request: ${request || "none — use your best judgement"}

Output a single JSON object (not an array) with this exact structure:

{
  "workout_type": "push" | "pull" | "legs" | "rest",
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

Rules:
- At least 3 exercises
- target_weight_kg of 0 means bodyweight
- Respect areas_to_avoid strictly
- Use recent workout data to inform appropriate weights and avoid repeating muscle groups
- Honour the special request above
- Output only the raw JSON object — no markdown, no explanation, no code fences`
}

export type DayValidationResult =
  | { ok: true; day: GeneratedDay }
  | { ok: false; error: string }

export function validateDayJson(raw: string): DayValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "Not valid JSON — paste the raw object from Claude, no markdown." }
  }

  const result = WorkoutDaySchema.safeParse(parsed)
  if (!result.success) {
    const first = result.error.issues[0]
    const path = first.path.length ? ` (${first.path.join(".")})` : ""
    return { ok: false, error: `${first.message}${path}` }
  }

  return { ok: true, day: { ...result.data, day_offset: 0 } }
}
