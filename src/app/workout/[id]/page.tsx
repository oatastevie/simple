import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import WorkoutClient from "./WorkoutClient"

const WORKOUT_LABELS: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  rest: "Rest",
}

export type PreviousSet = {
  set_number: number | null
  reps_completed: number | null
  weight_kg: number | null
  notes: string | null
}

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, scheduled_date, workout_type, completed_at, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!workout) notFound()

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment, target_sets, target_reps, target_weight_kg, rest_seconds, completed, skipped, order_index")
    .eq("workout_id", id)
    .order("order_index", { ascending: true })

  const exerciseIds = (exercises ?? []).map(e => e.id)
  const exerciseNames = (exercises ?? []).map(e => e.name).filter(Boolean) as string[]

  const { data: allSets } = exerciseIds.length
    ? await supabase
        .from("sets")
        .select("id, exercise_id, set_number, reps_completed, weight_kg, notes")
        .in("exercise_id", exerciseIds)
        .order("set_number", { ascending: true })
    : { data: [] }

  type SetRow = NonNullable<typeof allSets>[number]
  const setsMap = (allSets ?? []).reduce<Record<string, SetRow[]>>((acc, s) => {
    if (!s.exercise_id) return acc
    acc[s.exercise_id] = acc[s.exercise_id] ?? []
    acc[s.exercise_id]!.push(s)
    return acc
  }, {})

  // Historical sets from the most recent previous workout per exercise name
  const previousSetsByName: Record<string, PreviousSet[]> = {}

  if (exerciseNames.length) {
    const { data: recentWorkouts } = await supabase
      .from("workouts")
      .select("id")
      .eq("user_id", user.id)
      .neq("id", id)
      .not("completed_at", "is", null)
      .order("scheduled_date", { ascending: false })
      .limit(20)

    const recentIds = (recentWorkouts ?? []).map(w => w.id)

    if (recentIds.length) {
      const { data: prevExercises } = await supabase
        .from("exercises")
        .select("id, name, workout_id")
        .in("workout_id", recentIds)
        .in("name", exerciseNames)

      if (prevExercises?.length) {
        const latestExerciseIdByName: Record<string, string> = {}
        for (const wId of recentIds) {
          for (const ex of prevExercises) {
            if (ex.workout_id === wId && ex.name && !latestExerciseIdByName[ex.name]) {
              latestExerciseIdByName[ex.name] = ex.id
            }
          }
        }

        const latestIds = Object.values(latestExerciseIdByName)
        if (latestIds.length) {
          const { data: prevSets } = await supabase
            .from("sets")
            .select("exercise_id, set_number, reps_completed, weight_kg, notes")
            .in("exercise_id", latestIds)
            .order("set_number", { ascending: true })

          const idToName = Object.fromEntries(
            Object.entries(latestExerciseIdByName).map(([name, exId]) => [exId, name])
          )
          for (const s of prevSets ?? []) {
            if (!s.exercise_id) continue
            const name = idToName[s.exercise_id]
            if (!name) continue
            previousSetsByName[name] = previousSetsByName[name] ?? []
            previousSetsByName[name].push(s)
          }
        }
      }
    }
  }

  const label = WORKOUT_LABELS[workout.workout_type ?? ""] ?? workout.workout_type
  const dateLabel = new Date((workout.scheduled_date ?? "") + "T00:00:00Z")
    .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })

  return (
    <WorkoutClient
      workoutId={id}
      label={label ?? ""}
      dateLabel={dateLabel}
      alreadyCompleted={!!workout.completed_at}
      exercises={exercises ?? []}
      setsMap={setsMap}
      previousSetsByName={previousSetsByName}
    />
  )
}
