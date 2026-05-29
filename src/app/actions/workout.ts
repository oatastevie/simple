"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function logSet(
  exerciseId: string,
  setNumber: number,
  repsCompleted: number,
  weightKg: number,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  await supabase.from("sets").insert({
    exercise_id: exerciseId,
    set_number: setNumber,
    reps_completed: repsCompleted,
    weight_kg: weightKg,
  })

  // Check if all target sets are now logged — if so, mark exercise completed
  const { data: exercise } = await supabase
    .from("exercises")
    .select("target_sets, workout_id")
    .eq("id", exerciseId)
    .single()

  if (exercise) {
    const { count } = await supabase
      .from("sets")
      .select("id", { count: "exact", head: true })
      .eq("exercise_id", exerciseId)
      .is("skipped", false)

    if ((count ?? 0) >= (exercise.target_sets ?? 0)) {
      await supabase
        .from("exercises")
        .update({ completed: true })
        .eq("id", exerciseId)
    }

    revalidatePath(`/workout/${exercise.workout_id}`)
  }
}

export async function skipExercise(exerciseId: string, workoutId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  await supabase
    .from("exercises")
    .update({ skipped: true })
    .eq("id", exerciseId)

  revalidatePath(`/workout/${workoutId}`)
}

export async function completeWorkout(workoutId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  await supabase
    .from("workouts")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", workoutId)
    .eq("user_id", user.id)

  revalidatePath("/")
  redirect("/")
}
