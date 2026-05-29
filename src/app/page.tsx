import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { cn } from "@/lib/utils"

const WORKOUT_LABELS: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  full_body: "Full Body",
  cardio: "Cardio",
  rest: "Rest",
}

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
    .select("id, scheduled_date, workout_type, completed_at")
    .eq("programme_id", programme.id)
    .order("scheduled_date", { ascending: true })

  const workoutIds = (workouts ?? []).map(w => w.id)

  const { data: exercises } = workoutIds.length
    ? await supabase
        .from("exercises")
        .select("id, workout_id, name, muscle_group, equipment, target_sets, target_reps, target_weight_kg, order_index, completed, skipped")
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
  const todayWorkout = (workouts ?? []).find(w => w.scheduled_date === today)

  return (
    <div className="min-h-screen px-4 pt-8 pb-10 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Week {programme.week_number}</h1>
          {todayWorkout && todayWorkout.workout_type !== "rest" && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Today · {WORKOUT_LABELS[todayWorkout.workout_type ?? ""] ?? todayWorkout.workout_type}
            </p>
          )}
          {todayWorkout?.workout_type === "rest" && (
            <p className="text-sm text-muted-foreground mt-0.5">Today · Rest day</p>
          )}
        </div>
        <a
          href="/onboarding/generating"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          Regenerate
        </a>
      </div>

      {/* Day cards */}
      <div className="space-y-3">
        {(workouts ?? []).map(workout => {
          const exs = exercisesByWorkout[workout.id] ?? []
          const today = isToday(workout.scheduled_date ?? "")
          const past = isPast(workout.scheduled_date ?? "")
          const completed = !!workout.completed_at
          const isRest = workout.workout_type === "rest"
          const { weekday, short } = formatDate(workout.scheduled_date ?? "")

          return (
            <div
              key={workout.id}
              className={cn(
                "rounded-2xl border px-5 py-4 transition-colors",
                today && "border-foreground bg-card",
                !today && "border-border bg-card",
                past && !today && "opacity-60",
              )}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-medium", today ? "text-foreground" : "text-muted-foreground")}>
                    {today ? "Today" : weekday}
                  </span>
                  <span className="text-xs text-muted-foreground">{short}</span>
                </div>
                <div className="flex items-center gap-2">
                  {completed && (
                    <span className="text-xs text-muted-foreground">Done</span>
                  )}
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    isRest
                      ? "bg-muted text-muted-foreground"
                      : today
                        ? "bg-foreground text-background"
                        : "bg-muted text-foreground"
                  )}>
                    {WORKOUT_LABELS[workout.workout_type ?? ""] ?? workout.workout_type}
                  </span>
                </div>
              </div>

              {/* Exercises */}
              {isRest ? (
                <p className="text-sm text-muted-foreground">Rest and recover</p>
              ) : exs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exercises</p>
              ) : today ? (
                // Today: full exercise list
                <div className="mt-3 space-y-2">
                  {exs.map(ex => (
                    <div key={ex.id} className={cn(
                      "flex items-center justify-between text-sm",
                      ex.completed && "opacity-50 line-through",
                      ex.skipped && "opacity-40",
                    )}>
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {ex.target_sets}×{ex.target_reps}
                        {ex.target_weight_kg
                          ? ` · ${ex.target_weight_kg}kg`
                          : " · BW"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                // Other days: compact summary
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {exs.map(ex => ex.name).join(" · ")}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
