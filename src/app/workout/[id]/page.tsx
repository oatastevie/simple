import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import ExerciseCard from "@/app/components/ExerciseCard"
import CompleteWorkoutButton from "@/app/components/CompleteWorkoutButton"
import Link from "next/link"

const WORKOUT_LABELS: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  full_body: "Full Body",
  cardio: "Cardio",
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
    .select("id, name, muscle_group, equipment, target_sets, target_reps, target_weight_kg, completed, skipped, order_index")
    .eq("workout_id", id)
    .order("order_index", { ascending: true })

  const exerciseIds = (exercises ?? []).map(e => e.id)
  const exerciseNames = (exercises ?? []).map(e => e.name).filter(Boolean) as string[]

  // Current session sets
  const { data: allSets } = exerciseIds.length
    ? await supabase
        .from("sets")
        .select("id, exercise_id, set_number, reps_completed, weight_kg, notes")
        .in("exercise_id", exerciseIds)
        .order("set_number", { ascending: true })
    : { data: [] }

  type SetRow = NonNullable<typeof allSets>[number]
  const setsByExercise = (allSets ?? []).reduce<Record<string, SetRow[]>>((acc, s) => {
    if (!s.exercise_id) return acc
    acc[s.exercise_id] = acc[s.exercise_id] ?? []
    acc[s.exercise_id]!.push(s)
    return acc
  }, {})

  // Historical sets — find the most recent previous workout containing each exercise by name
  const previousSetsByName: Record<string, PreviousSet[]> = {}

  if (exerciseNames.length) {
    // Fetch recent completed workouts for this user (excluding current)
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
      // Find exercises with matching names from those workouts
      const { data: prevExercises } = await supabase
        .from("exercises")
        .select("id, name, workout_id")
        .in("workout_id", recentIds)
        .in("name", exerciseNames)

      if (prevExercises?.length) {
        // For each exercise name, pick the most recent workout's exercise
        // recentWorkouts is ordered by date desc, so iterate in order
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

          // Group by exercise_id then re-key by name
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

  const exs = exercises ?? []
  const allDone = exs.length > 0 && exs.every(e => e.completed || e.skipped)
  const label = WORKOUT_LABELS[workout.workout_type ?? ""] ?? workout.workout_type
  const date = new Date((workout.scheduled_date ?? "") + "T00:00:00Z")
  const dateLabel = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })

  return (
    <div className="min-h-screen px-4 pt-8 pb-24 max-w-lg mx-auto w-full">
      <Link href="/" className="text-sm text-muted-foreground mb-6 inline-block">
        ← Home
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-semibold tracking-tight">{label} day</h1>
          {workout.completed_at && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Done</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </div>

      <div className="space-y-3">
        {exs.map(ex => (
          <ExerciseCard
            key={ex.id}
            workoutId={id}
            exerciseId={ex.id}
            name={ex.name ?? ""}
            muscleGroup={ex.muscle_group}
            equipment={ex.equipment}
            targetSets={ex.target_sets ?? 0}
            targetReps={ex.target_reps ?? 0}
            targetWeightKg={ex.target_weight_kg ?? 0}
            completed={!!ex.completed}
            skipped={!!ex.skipped}
            loggedSets={setsByExercise[ex.id] ?? []}
            previousSets={(previousSetsByName[ex.name ?? ""] ?? []).slice(0, 2)}
          />
        ))}
      </div>

      {!workout.completed_at && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-background/80 backdrop-blur max-w-lg mx-auto">
          <CompleteWorkoutButton workoutId={id} allDone={allDone} />
        </div>
      )}
    </div>
  )
}
