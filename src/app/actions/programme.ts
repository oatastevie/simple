"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type { GeneratedDay } from "@/lib/ai/programme-schema"

export async function saveProgramme(
  days: GeneratedDay[],
  weekNumber: number,
): Promise<{ programmeId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const today = new Date()

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
    const scheduledDate = new Date(today)
    scheduledDate.setDate(today.getDate() + day.day_offset)
    const dateStr = scheduledDate.toISOString().split("T")[0]

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
        const d = new Date(w.scheduled_date! + "T00:00:00")
        d.setDate(d.getDate() - 1)
        await supabase
          .from("workouts")
          .update({ scheduled_date: d.toISOString().split("T")[0] })
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
