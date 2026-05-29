# Workout Tracker — Build Checklist

## Stack
- Next.js (App Router, TypeScript, Tailwind)
- Supabase (auth + database)
- shadcn/ui
- AI: Chrome Prompt API (default), Claude (tool_use), OpenAI (response_format json_schema)

---

## 1. Auth
- [x] Supabase client (browser + server)
- [x] Middleware — redirect unauthenticated users to /auth/login
- [x] Login/signup page (`/auth/login`)
- [x] Login/signup server actions
- [x] Auth callback route (`/auth/callback`) for email confirmation redirects
- [x] Error display on login page (reads `?error=` from URL)
- [x] Sign out action

---

## 2. Database
- [x] Migration: users, programme, workouts, exercises, sets tables
- [x] Row level security policies
- [x] Supabase type generation (`supabase gen types typescript`)

---

## 3. Onboarding (`/onboarding`)
Nine screens, one question each. State held in memory until final submit, then written to `users` table in one call. Redirect to `/` on completion. Skip onboarding if user already has a `users` row.

- [x] Onboarding layout with progress bar
- [x] Screen 1 — Goal (single select: Lose weight / Build muscle / Get fitter / Stay active)
- [x] Screen 2 — Age (numeric input)
- [x] Screen 3 — Sex (single select: Male / Female / Prefer not to say)
- [x] Screen 4 — Job type (single select: Sedentary / Lightly active / On your feet all day)
- [x] Screen 5 — Lifting frequency (single select: Never / 1-2x week / 3-4x week / 5x+ week)
- [x] Screen 6 — Cardio (frequency single select + type multi-select)
- [x] Screen 7 — Height & Weight (numeric inputs with metric/imperial toggle)
- [x] Screen 8 — Body fat % (optional numeric input, skip button)
- [x] Screen 9 — Areas to avoid (multi-select: Lower back / Knees / Shoulders / None)
- [ ] Final submit — write to `users` table, trigger AI programme generation, redirect to `/`

---

## 4. AI Programme Generation
Runs after onboarding completes and whenever the programme needs regenerating. Output is always structured JSON validated against a shared schema before being written to the database.

- [ ] Define shared JSON schema for AI output (week of workouts with exercises per day)
- [ ] Chrome Prompt API provider (uses `responseConstraint`)
- [ ] Claude provider (uses `tool_use`)
- [ ] OpenAI provider (uses `response_format: { type: "json_schema" }`)
- [ ] Provider selector — tries Chrome Prompt API first, falls back to user's preferred cloud model
- [ ] Write generated programme to `programme` table (`is_active = true`, deactivate previous)
- [ ] Explode programme JSON into `workouts` and `exercises` rows

---

## 5. Home Screen (`/`)
- [ ] Redirect to `/onboarding` if no user profile row
- [ ] Redirect to `/onboarding` if no active programme
- [ ] Today's workout card — shows workout name, exercise list summary
- [ ] Rest day screen — shown when today has no workout
- [ ] Weekly calendar strip — 7 days, highlights today, shows completed/upcoming/rest states

---

## 6. Workout Screen (`/workout/[id]`)
- [ ] Exercise cards — name, muscle group, target sets × reps @ weight
- [ ] Tap card to log a set — opens set logging sheet (reps + weight inputs, confirm)
- [ ] Swipe card to skip exercise — marks exercise as skipped
- [ ] Progress indicator — sets logged vs target per exercise
- [ ] Mark workout complete — sets `completed_at`, triggers background AI adaptation check

---

## 7. Set Logging
- [ ] Sheet/drawer UI for logging a single set (reps completed, weight used)
- [ ] Write set to `sets` table
- [ ] Auto-advance to next set or close sheet on confirm
- [ ] Mark exercise as completed when all target sets are logged

---

## 8. AI Adaptation (background, runs after workout completion)
- [ ] Check for muscle groups trained in last 48 hours
- [ ] Compare logged sets vs targets — detect consistent over/under performance
- [ ] Detect skipped sessions
- [ ] Regenerate or patch programme if adaptation is warranted
- [ ] Detect high consistency and flag for potential training day increase (surface as a UI suggestion card)

---

## 9. Settings (`/settings`)
- [ ] Preferred AI model selector (Chrome Prompt API / Claude / OpenAI)
- [ ] API key inputs for cloud models (stored in localStorage, never sent to server)
- [ ] Sign out button

---

## 10. Future (not in v1)
- Profile page to update metrics — triggers programme regeneration
- Sleep quality and stress inputs
- Unit preference editing