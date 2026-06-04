"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function saveAiContext(context: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  await supabase
    .from("users")
    .update({ ai_context: context.trim() || null })
    .eq("id", user.id)

  revalidatePath("/")
}
