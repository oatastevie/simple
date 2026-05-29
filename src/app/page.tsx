import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

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
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!programme) redirect("/onboarding/generating")

  // TODO: home screen
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Home screen coming soon</p>
    </div>
  )
}
