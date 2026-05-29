import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import OnboardingFlow from "./OnboardingFlow"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single()

  if (profile) redirect("/")

  return <OnboardingFlow />
}