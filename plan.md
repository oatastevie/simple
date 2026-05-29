# Workout Tracker — Project Spec

## Overview
A personal workout tracker web app that uses AI to generate and adapt personalised workout schedules. The AI acts as the engine, not the interface — users never interact with it directly, it works silently in the background.

## Tech Stack
- **Frontend**:  Next.js
- **Backend / Database**: Supabase (free tier)
- **Hosting**: Vercel
- **AI**: Chrome Prompt API (Gemini Nano, on-device) as default, with support for swappable cloud model APIs (Anthropic Claude, OpenAI) as fallback or user preference

## AI Strategy
- Chrome Prompt API is the default — free, private, on-device, no API key required
- Cloud model APIs (Claude, OpenAI) used for richer reasoning or as fallback when Chrome API hardware requirements aren't met
- User can select preferred model in settings
- All AI output is structured JSON — never rendered as freeform text or chat bubbles
- AI is invisible in the UX — output always rendered as structured app UI
- Structured output is provider-specific: Chrome Prompt API uses `responseConstraint` (JSON Schema); Anthropic Claude uses `tool_use`; OpenAI uses `response_format: { type: "json_schema" }`
- A shared JSON Schema definition is validated client-side after generation regardless of provider

## Assumptions (locked)
- **Equipment**: Full gym assumed for all users
- **Session length**: Not collected — AI decides based on other inputs

---

## Onboarding Flow

Nine screens, mostly single taps. Collected once on first login, editable later via profile page.

| # | Screen | Input Type | Options |
|---|--------|-----------|---------|
| 1 | **Goal** | Single select | Lose weight / Build muscle / Get fitter / Stay active |
| 2 | **Age** | Numeric input | Free number entry |
| 3 | **Sex** | Single select | Male / Female / Prefer not to say |
| 4 | **Job type** | Single select | Sedentary / Lightly active / On your feet all day |
| 5 | **Lifting frequency** | Single select | Never / 1-2x week / 3-4x week / 5x+ week |
| 6 | **Cardio** | Two part — frequency single select + type multi-select | Frequency: Never / 1-2x week / 3-4x week / 5x+ week — Type: Running / Cycling / Swimming / HIIT / Walking / None |
| 7 | **Height & Weight** | Numeric inputs with unit toggle | Metric (kg / cm) or Imperial (lbs / ft) |
| 8 | **Body fat %** | Optional numeric input | Skip button available |
| 9 | **Areas to avoid** | Multi-select | Lower back / Knees / Shoulders / None |

### Onboarding UX Rules
- One question per screen
- Progress bar at top
- Large tappable option cards
- Minimal free text input (only Age, Height, Weight, Body fat %)
- Skip button on Body fat % screen only

---

## What the AI Does With Onboarding Data

On completion the AI generates a full initial week of workouts. The schedule structure (number of days, split type, rest day placement) is decided entirely by the AI based on inputs — the user does not pick days per week.

### Example AI reasoning:
- Experience level is inferred from `lifting_frequency` — Never = beginner, 5x+ = advanced
- Inferred beginner + lose weight → 3 days, full body, rest days between sessions
- Inferred advanced + build muscle → 5 days, push/pull/legs split
- High cardio frequency already → less cardio added, more lifting focus
- Knee issues → reduced lower body volume, substituted exercises
- Sedentary job + lose weight → higher activity volume recommended
- Older age → more rest days, lower volume per session

---

## Core App Experience (Post-Onboarding)

- Today's workout shown front and centre on open
- Rest days show a dedicated rest screen — no workout card, brief recovery message
- Each exercise rendered as a card — tap to log a set, swipe to skip
- Weekly calendar strip showing completed and upcoming sessions
- AI regenerates or adjusts the programme silently in the background as history builds
- No chat UI, no freeform text, no visible AI interaction

### AI Adaptation Over Time
- Avoids muscle groups trained in last 48 hours
- Progressively increases weight/reps week over week
- Notices skipped sessions and adjusts
- Can suggest increasing training days if consistency is high

---

## Data Model (Supabase)

### `users`
- id, created_at
- goal, age, sex, job_type
- lifting_frequency, cardio_frequency, cardio_types
- height, weight, unit_preference (metric/imperial)
- body_fat_percentage (nullable)
- areas_to_avoid
- preferred_ai_model

### `workouts`
- id, user_id, created_at
- programme_id (foreign key → `programme`)
- scheduled_date, completed_at (nullable)
- ai_generated (boolean)
- notes (nullable)

### `exercises`
- id, workout_id
- name, muscle_group, equipment
- target_sets, target_reps, target_weight_kg
- completed (boolean)
- skipped (boolean)
- order_index
- notes (nullable)

### `sets`
- id, exercise_id
- set_number
- reps_completed, weight_kg
- skipped (boolean)
- notes (nullable)
- created_at

### `programme`
- id, user_id, created_at
- week_number
- is_active (boolean)
- generated_by (chrome_prompt_api / claude / openai)
- raw_json (full AI output)

---

## Future Considerations
- Profile page to update metrics (weight, body fat, activity levels) — AI regenerates programme on update
- Sleep quality and stress level inputs for more precise recovery planning
- Unit preference persisted per user in Supabase