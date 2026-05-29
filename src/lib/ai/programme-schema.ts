import { z } from "zod"

export const WORKOUT_TYPES = ["push", "pull", "legs", "full_body", "cardio", "rest"] as const

export const ExerciseSchema = z.object({
  name: z.string(),
  muscle_group: z.string(),
  equipment: z.string(),
  target_sets: z.number().int().min(1).max(8),
  target_reps: z.number().int().min(1).max(30),
  target_weight_kg: z.number().min(0),
})

// Schema without the .refine() business rule — used for JSON Schema export only.
// The Chrome Prompt API cannot enforce refine predicates; Zod validates those after generation.
const WorkoutDayBaseSchema = z.object({
  workout_type: z.enum(WORKOUT_TYPES),
  exercises: z.array(ExerciseSchema).optional(),
})

export const WorkoutDaySchema = WorkoutDayBaseSchema.refine(
  (day: z.infer<typeof WorkoutDayBaseSchema>) => day.workout_type === "rest"
    ? !day.exercises?.length
    : (day.exercises?.length ?? 0) > 0,
  { message: "Rest days must have no exercises; training days need at least one" }
)

export type WorkoutDay = z.infer<typeof WorkoutDaySchema>
export type GeneratedDay = WorkoutDay & { day_offset: number }

// Zod v4 built-in JSON Schema export — used as responseConstraint for Chrome Prompt API.
export const workoutDayJsonSchema = z.toJSONSchema(WorkoutDayBaseSchema)
