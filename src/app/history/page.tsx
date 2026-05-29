import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import RedoButton from "@/app/components/RedoButton"

const WORKOUT_LABELS: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  full_body: "Full Body",
  cardio: "Cardio",
  rest: "Rest",
}

function monthLabel(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

function dayLabel(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const cutoff = threeMonthsAgo.toISOString().split("T")[0]

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, scheduled_date, workout_type, completed_at")
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .gte("scheduled_date", cutoff)
    .order("scheduled_date", { ascending: false })

  const workoutIds = (workouts ?? []).map(w => w.id)

  const { data: exercises } = workoutIds.length
    ? await supabase
        .from("exercises")
        .select("id, workout_id, name, target_sets, target_reps, target_weight_kg")
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

  // Group workouts by month
  const grouped: { month: string; items: NonNullable<typeof workouts> }[] = []
  for (const w of workouts ?? []) {
    const month = monthLabel(w.scheduled_date ?? "")
    const last = grouped[grouped.length - 1]
    if (last?.month === month) {
      last.items.push(w)
    } else {
      grouped.push({ month, items: [w] })
    }
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="min-h-screen px-4 pt-8 pb-10 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-sm text-muted-foreground mb-2 inline-block">← Home</Link>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Last 3 months</p>
        </div>
      </div>

      {grouped.length === 0 && (
        <p className="text-sm text-muted-foreground">No completed workouts yet.</p>
      )}

      <div className="space-y-8">
        {grouped.map(({ month, items }) => (
          <div key={month}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{month}</p>
            <div className="space-y-2">
              {items.map(workout => {
                const exs = exercisesByWorkout[workout.id] ?? []
                const label = WORKOUT_LABELS[workout.workout_type ?? ""] ?? workout.workout_type
                const isToday = workout.scheduled_date === today

                return (
                  <div key={workout.id} className="rounded-2xl border border-border bg-card px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{dayLabel(workout.scheduled_date ?? "")}</span>
                        {isToday && <span className="text-xs text-muted-foreground">(today)</span>}
                      </div>
                      <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">{label}</span>
                    </div>

                    {exs.length > 0 && (
                      <p className="text-xs text-muted-foreground mb-3 truncate">
                        {exs.map(e => e.name).join(" · ")}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{exs.length} exercises</span>
                      {!isToday && (
                        <RedoButton pastWorkoutId={workout.id} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
