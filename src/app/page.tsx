import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DayCard from "@/app/components/DayCard"

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return {
    weekday: d.toLocaleDateString("en-GB", { weekday: "long" }),
    short: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
  }
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0]
}

function isPast(dateStr: string) {
  return dateStr < new Date().toISOString().split("T")[0]
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/onboarding")

  const { data: programme } = await supabase
    .from("programme")
    .select("id, week_number")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!programme) redirect("/onboarding/generating")

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, scheduled_date, workout_type, completed_at, skipped_at")
    .eq("programme_id", programme.id)
    .order("scheduled_date", { ascending: true })

  const workoutIds = (workouts ?? []).map(w => w.id)

  const { data: exercises } = workoutIds.length
    ? await supabase
        .from("exercises")
        .select("id, workout_id, name, target_sets, target_reps, target_weight_kg, completed, skipped")
        .in("workout_id", workoutIds)
        .order("order_index", { ascending: true })
    : { data: [] }

  type Exercise = NonNullable<typeof exercises>[number]
  const exercisesByWorkout = (exercises ?? []).reduce<Record<string, Exercise[]>>((acc, ex) => {
    if (!ex.workout_id) return acc
    acc[ex.workout_id] = acc[ex.workout_id] ?? []
    acc[ex.workout_id]!.push(ex)
    return acc
  }, {})

  const today = new Date().toISOString().split("T")[0]
  const todayWorkout = (workouts ?? []).find(w => w.scheduled_date === today && !w.skipped_at)

  return (
    <div className="min-h-screen px-4 pt-8 pb-10 max-w-lg mx-auto w-full">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Week {programme.week_number}</h1>
          {todayWorkout && todayWorkout.workout_type !== "rest" && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Today · {todayWorkout.workout_type}
            </p>
          )}
          {(!todayWorkout || todayWorkout.workout_type === "rest") && (
            <p className="text-sm text-muted-foreground mt-0.5">Rest day</p>
          )}
        </div>
        <a
          href="/onboarding/generating"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          Regenerate
        </a>
      </div>

      <div className="space-y-3">
        {(workouts ?? []).map(workout => {
          const exs = exercisesByWorkout[workout.id] ?? []
          const { weekday, short } = formatDate(workout.scheduled_date ?? "")

          return (
            <DayCard
              key={workout.id}
              workoutId={workout.id}
              scheduledDate={workout.scheduled_date ?? ""}
              workoutType={workout.workout_type}
              completedAt={workout.completed_at}
              skippedAt={workout.skipped_at}
              exercises={exs}
              isToday={isToday(workout.scheduled_date ?? "")}
              isPast={isPast(workout.scheduled_date ?? "")}
              weekday={weekday}
              short={short}
            />
          )
        })}
      </div>
    </div>
  )
}
