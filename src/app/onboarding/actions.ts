"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

type OnboardingData = {
  goal: string
  secondary_goal: string
  age: string
  sex: string
  job_type: string
  lifting_frequency: string
  cardio_frequency: string
  cardio_types: string[]
  height_ft: string
  height_in: string
  height_cm: string
  weight: string
  unit_preference: "metric" | "imperial" | "mixed"
  body_fat_percentage: string
  areas_to_avoid: string[]
}

function toHeightCm(data: OnboardingData): number {
  if (data.unit_preference === "metric") return parseFloat(data.height_cm)
  const ft = parseFloat(data.height_ft) || 0
  const inches = parseFloat(data.height_in) || 0
  return Math.round((ft * 30.48) + (inches * 2.54))
}

function toWeightKg(data: OnboardingData): number {
  const w = parseFloat(data.weight)
  return data.unit_preference === "imperial" ? Math.round(w * 0.453592 * 10) / 10 : w
}

export async function submitOnboarding(data: OnboardingData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { error } = await supabase.from("users").insert({
    id: user.id,
    goal: data.goal,
    secondary_goal: data.secondary_goal || null,
    age: parseInt(data.age),
    sex: data.sex,
    job_type: data.job_type,
    lifting_frequency: data.lifting_frequency,
    cardio_frequency: data.cardio_frequency,
    cardio_types: data.cardio_types,
    height: toHeightCm(data),
    weight: toWeightKg(data),
    unit_preference: data.unit_preference,
    body_fat_percentage: data.body_fat_percentage ? parseFloat(data.body_fat_percentage) : null,
    areas_to_avoid: data.areas_to_avoid.filter(a => a !== "None"),
    preferred_ai_model: "chrome",
  })

  if (error) throw new Error(error.message)
}