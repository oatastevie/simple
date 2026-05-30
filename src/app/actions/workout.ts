"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function logSet(
  exerciseId: string,
  setNumber: number,
  repsCompleted: number,
  weightKg: number,
  notes: string,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  await supabase.from("sets").insert({
    exercise_id: exerciseId,
    set_number: setNumber,
    reps_completed: repsCompleted,
    weight_kg: weightKg,
    notes: notes.trim() || null,
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

// Copies a past workout as today's workout, skipping today's planned one.
// Returns the new workout's ID.
export async function replaceDayWorkout(
  workoutId: string,
  workoutType: string,
  exercises: Array<{
    name: string
    muscle_group: string
    equipment: string
    target_sets: number
    target_reps: number
    target_weight_kg: number
  }>,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Delete existing exercises (no sets logged yet if regenerating)
  await supabase.from("exercises").delete().eq("workout_id", workoutId)

  // Update workout type
  await supabase
    .from("workouts")
    .update({ workout_type: workoutType } as any)
    .eq("id", workoutId)
    .eq("user_id", user.id)

  // Insert new exercises
  await supabase.from("exercises").insert(
    exercises.map((ex, i) => ({
      workout_id: workoutId,
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
  )

  revalidatePath("/")
  revalidatePath(`/workout/${workoutId}`)
}

export async function redoWorkout(pastWorkoutId: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const today = new Date().toISOString().split("T")[0]

  // Get the past workout's exercises
  const { data: pastExercises } = await supabase
    .from("exercises")
    .select("name, muscle_group, equipment, target_sets, target_reps, target_weight_kg, order_index")
    .eq("workout_id", pastWorkoutId)
    .order("order_index", { ascending: true })

  if (!pastExercises?.length) throw new Error("No exercises found in that workout")

  // Get the past workout's type
  const { data: pastWorkout } = await supabase
    .from("workouts")
    .select("workout_type")
    .eq("id", pastWorkoutId)
    .single()

  // Find the active programme
  const { data: programme } = await supabase
    .from("programme")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!programme) throw new Error("No active programme")

  // Skip today's planned workout (if any, and not already completed/skipped)
  await supabase
    .from("workouts")
    .update({ skipped_at: new Date().toISOString() })
    .eq("programme_id", programme.id)
    .eq("scheduled_date", today)
    .is("completed_at", null)
    .is("skipped_at", null)

  // Create a new workout for today
  const { data: newWorkout, error } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      programme_id: programme.id,
      scheduled_date: today,
      workout_type: pastWorkout?.workout_type ?? "push",
      ai_generated: false,
    } as any)
    .select("id")
    .single()

  if (error || !newWorkout) throw new Error(error?.message ?? "Failed to create workout")

  // Copy exercises
  await supabase.from("exercises").insert(
    pastExercises.map((ex, i) => ({
      workout_id: newWorkout.id,
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
  )

  revalidatePath("/")
  return newWorkout.id
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
