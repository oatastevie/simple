"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type { GeneratedDay } from "@/lib/ai/programme-schema"
import { ExerciseSchema } from "@/lib/ai/programme-schema"
import { z } from "zod"

// UTC-safe date arithmetic on YYYY-MM-DD strings.
// Avoids the local-time → toISOString() pitfall that shifts dates in non-UTC zones.
function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split("T")[0]
}

export async function saveProgramme(
  days: GeneratedDay[],
  weekNumber: number,
): Promise<{ programmeId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Use UTC date string — same canonical form used everywhere else
  const todayStr = new Date().toISOString().split("T")[0]

  await supabase
    .from("programme")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true)

  const { data: programme, error: progError } = await supabase
    .from("programme")
    .insert({
      user_id: user.id,
      week_number: weekNumber,
      is_active: true,
      generated_by: "chrome_prompt_api",
      raw_json: days as any,
    })
    .select("id")
    .single()

  if (progError || !programme) throw new Error(progError?.message ?? "Failed to create programme")

  for (const day of days) {
    const dateStr = shiftDate(todayStr, day.day_offset)

    const { data: workout, error: wError } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
        programme_id: programme.id,
        scheduled_date: dateStr,
        workout_type: day.workout_type,
        ai_generated: true,
      } as any)
      .select("id")
      .single()

    if (wError || !workout) continue

    if (day.workout_type !== "rest" && day.exercises?.length) {
      const exerciseRows = day.exercises.map((ex, i) => ({
        workout_id: workout.id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        equipment: ex.equipment,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        target_weight_kg: ex.target_weight_kg,
        rest_seconds: ex.rest_seconds,
        order_index: i,
        completed: false,
        skipped: false,
      }))

      await supabase.from("exercises").insert(exerciseRows)
    }
  }

  return { programmeId: programme.id }
}

// Marks a workout as skipped. If shiftFuture is true, all later workouts in the
// same programme shift back 1 day so tomorrow's session becomes today's.
export async function skipWorkout(
  workoutId: string,
  shiftFuture: boolean,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Fetch the workout to get its date and programme
  const { data: workout } = await supabase
    .from("workouts")
    .select("scheduled_date, programme_id")
    .eq("id", workoutId)
    .eq("user_id", user.id)
    .single()

  if (!workout) return

  await supabase
    .from("workouts")
    .update({ skipped_at: new Date().toISOString() })
    .eq("id", workoutId)

  if (shiftFuture && workout.scheduled_date && workout.programme_id) {
    // Only shift non-skipped workouts scheduled after the skipped one
    const { data: future } = await supabase
      .from("workouts")
      .select("id, scheduled_date")
      .eq("programme_id", workout.programme_id)
      .gt("scheduled_date", workout.scheduled_date)
      .is("skipped_at", null)
      .order("scheduled_date", { ascending: true })

    if (future?.length) {
      // Capture the freed slot before any updates
      const freedDate = future[future.length - 1].scheduled_date!

      // Shift sequentially (ascending) so dates never collide mid-update
      for (const w of future) {
        await supabase
          .from("workouts")
          .update({ scheduled_date: shiftDate(w.scheduled_date!, -1) })
          .eq("id", w.id)
      }

      // Place the skipped workout at the freed end slot
      await supabase
        .from("workouts")
        .update({ scheduled_date: freedDate })
        .eq("id", workoutId)
    }
  }

  revalidatePath("/")
}

export async function getNextWeekNumber(userId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("programme")
    .select("week_number")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()
  return (data?.week_number ?? 0) + 1
}

export type PastProgramme = {
  id: string
  weekNumber: number | null
  createdAt: string | null
  workoutTypes: string[]
}

export async function getPastProgrammes(): Promise<PastProgramme[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("programme")
    .select("id, week_number, created_at, raw_json")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  return (data ?? []).map(p => {
    const days = Array.isArray(p.raw_json) ? p.raw_json as Array<{ workout_type?: string }> : []
    const workoutTypes = days.map(d => d.workout_type ?? "?")
    return {
      id: p.id,
      weekNumber: p.week_number,
      createdAt: p.created_at,
      workoutTypes,
    }
  })
}

const StoredExerciseSchema = ExerciseSchema.extend({
  rest_seconds: z.number().int().min(0).default(90),
})

export async function repeatWeekProgramme(programmeId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: programme } = await supabase
    .from("programme")
    .select("raw_json, week_number")
    .eq("id", programmeId)
    .eq("user_id", user.id)
    .single()

  if (!programme?.raw_json) throw new Error("Programme not found")

  const days = programme.raw_json as Array<Record<string, unknown>>
  const nextWeekNumber = await getNextWeekNumber(user.id)
  const todayStr = new Date().toISOString().split("T")[0]

  await supabase
    .from("programme")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true)

  const { data: newProgramme, error } = await supabase
    .from("programme")
    .insert({
      user_id: user.id,
      week_number: nextWeekNumber,
      is_active: true,
      generated_by: "repeat",
      raw_json: programme.raw_json,
    })
    .select("id")
    .single()

  if (error || !newProgramme) throw new Error(error?.message ?? "Failed to create programme")

  for (let i = 0; i < days.length; i++) {
    const day = days[i]!
    const dateStr = shiftDate(todayStr, i)
    const workoutType = typeof day.workout_type === "string" ? day.workout_type : "rest"

    const { data: workout, error: wError } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
        programme_id: newProgramme.id,
        scheduled_date: dateStr,
        workout_type: workoutType,
        ai_generated: false,
      } as any)
      .select("id")
      .single()

    if (wError || !workout) continue

    const rawExercises = Array.isArray(day.exercises) ? day.exercises : []
    if (workoutType !== "rest" && rawExercises.length) {
      const exerciseRows = rawExercises.map((ex: unknown, idx: number) => {
        const parsed = StoredExerciseSchema.safeParse(ex)
        const e = parsed.success ? parsed.data : { name: "", muscle_group: "", equipment: "", target_sets: 3, target_reps: 10, target_weight_kg: 0, rest_seconds: 90 }
        return {
          workout_id: workout.id,
          name: (ex as any).name ?? e.name,
          muscle_group: e.muscle_group,
          equipment: e.equipment,
          target_sets: e.target_sets,
          target_reps: e.target_reps,
          target_weight_kg: e.target_weight_kg,
          rest_seconds: e.rest_seconds,
          order_index: idx,
          completed: false,
          skipped: false,
        }
      })

      await supabase.from("exercises").insert(exerciseRows)
    }
  }

  revalidatePath("/")
  redirect("/")
}
