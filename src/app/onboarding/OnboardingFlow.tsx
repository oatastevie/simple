"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitOnboarding } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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

const TOTAL_STEPS = 9

export default function OnboardingFlow() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    goal: "",
    secondary_goal: "",
    age: "",
    sex: "",
    job_type: "",
    lifting_frequency: "",
    cardio_frequency: "",
    cardio_types: [],
    height_ft: "",
    height_in: "",
    height_cm: "",
    weight: "",
    unit_preference: "metric",
    body_fat_percentage: "",
    areas_to_avoid: [],
  })

  function set<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
  }

  function toggleArray(key: "cardio_types" | "areas_to_avoid", value: string) {
    setData(prev => {
      const arr = prev[key]
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      }
    })
  }

  async function handleSubmit() {
    await submitOnboarding(data)
    router.push("/")
  }

  const canAdvance = (() => {
    if (step === 1) return !!data.goal
    if (step === 2) return !!data.age
    if (step === 3) return !!data.sex
    if (step === 4) return !!data.job_type
    if (step === 5) return !!data.lifting_frequency
    if (step === 6) return !!data.cardio_frequency
    if (step === 7) {
      const heightOk = data.unit_preference === "metric"
        ? !!data.height_cm
        : !!data.height_ft
      return heightOk && !!data.weight
    }
    if (step === 8) return true
    if (step === 9) return true
    return false
  })()

  return (
    <div className="min-h-screen flex flex-col px-4 pt-8 pb-6 max-w-lg mx-auto w-full">
      {/* Progress bar */}
      <div className="w-full h-1 bg-muted rounded-full mb-10">
        <div
          className="h-1 bg-foreground rounded-full transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col">
        {step === 1 && (
          <Step title="What's your goal?">
            <p className="text-sm text-muted-foreground mb-1">Primary</p>
            {["Lose weight", "Build muscle", "Get fitter", "Stay active"].map(option => (
              <OptionCard
                key={option}
                label={option}
                selected={data.goal === option}
                onSelect={() => {
                  set("goal", option)
                  if (data.secondary_goal === option) set("secondary_goal", "")
                }}
              />
            ))}
            {data.goal && (
              <>
                <p className="text-sm text-muted-foreground mt-5 mb-1">Secondary <span className="text-xs">(optional)</span></p>
                {["Lose weight", "Build muscle", "Get fitter", "Stay active"]
                  .filter(o => o !== data.goal)
                  .map(option => (
                    <OptionCard
                      key={option}
                      label={option}
                      selected={data.secondary_goal === option}
                      onSelect={() => set("secondary_goal", data.secondary_goal === option ? "" : option)}
                    />
                  ))}
              </>
            )}
          </Step>
        )}

        {step === 2 && (
          <Step title="How old are you?">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Age"
              value={data.age}
              onChange={e => set("age", e.target.value)}
              className="text-2xl h-14 text-center"
            />
          </Step>
        )}

        {step === 3 && (
          <Step title="What's your sex?">
            {["Male", "Female", "Prefer not to say"].map(option => (
              <OptionCard
                key={option}
                label={option}
                selected={data.sex === option}
                onSelect={() => set("sex", option)}
              />
            ))}
          </Step>
        )}

        {step === 4 && (
          <Step title="What's your job like?">
            {["Sedentary", "Lightly active", "On your feet all day"].map(option => (
              <OptionCard
                key={option}
                label={option}
                selected={data.job_type === option}
                onSelect={() => set("job_type", option)}
              />
            ))}
          </Step>
        )}

        {step === 5 && (
          <Step title="How often do you lift weights?">
            {["Never", "1-2x week", "3-4x week", "5x+ week"].map(option => (
              <OptionCard
                key={option}
                label={option}
                selected={data.lifting_frequency === option}
                onSelect={() => set("lifting_frequency", option)}
              />
            ))}
          </Step>
        )}

        {step === 6 && (
          <Step title="What about cardio?">
            <p className="text-sm text-muted-foreground mb-3">How often?</p>
            {["Never", "1-2x week", "3-4x week", "5x+ week"].map(option => (
              <OptionCard
                key={option}
                label={option}
                selected={data.cardio_frequency === option}
                onSelect={() => set("cardio_frequency", option)}
              />
            ))}
            {data.cardio_frequency && data.cardio_frequency !== "Never" && (
              <>
                <p className="text-sm text-muted-foreground mt-5 mb-3">What type? (pick all that apply)</p>
                {["Running", "Cycling", "Swimming", "HIIT", "Walking", "Competitive sports", "Leisure sports"].map(option => (
                  <OptionCard
                    key={option}
                    label={option}
                    selected={data.cardio_types.includes(option)}
                    onSelect={() => toggleArray("cardio_types", option)}
                    multi
                  />
                ))}
              </>
            )}
          </Step>
        )}

        {step === 7 && (
          <Step title="Height and weight">
            <div className="flex gap-2 mb-4">
              {(["metric", "imperial", "mixed"] as const).map(unit => (
                <Button
                  key={unit}
                  variant={data.unit_preference === unit ? "default" : "outline"}
                  size="sm"
                  onClick={() => set("unit_preference", unit)}
                >
                  {unit === "metric" ? "kg / cm" : unit === "imperial" ? "lbs / ft" : "kg / ft"}
                </Button>
              ))}
            </div>
            <div className="space-y-3">
              {data.unit_preference === "metric" ? (
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Height (cm)"
                  value={data.height_cm}
                  onChange={e => set("height_cm", e.target.value)}
                  className="h-14 text-lg"
                />
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="ft"
                    value={data.height_ft}
                    onChange={e => set("height_ft", e.target.value)}
                    className="h-14 text-lg"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="in"
                    value={data.height_in}
                    onChange={e => set("height_in", e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>
              )}
              <Input
                type="number"
                inputMode="decimal"
                placeholder={data.unit_preference === "imperial" ? "Weight (lbs)" : "Weight (kg)"}
                value={data.weight}
                onChange={e => set("weight", e.target.value)}
                className="h-14 text-lg"
              />
            </div>
          </Step>
        )}

        {step === 8 && (
          <Step title="Body fat %">
            <p className="text-sm text-muted-foreground mb-4">Optional — helps the AI give better recommendations</p>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 18"
              value={data.body_fat_percentage}
              onChange={e => set("body_fat_percentage", e.target.value)}
              className="h-14 text-lg text-center"
            />
          </Step>
        )}

        {step === 9 && (
          <Step title="Any areas to avoid?">
            {["Lower back", "Knees", "Shoulders", "None"].map(option => (
              <OptionCard
                key={option}
                label={option}
                selected={data.areas_to_avoid.includes(option)}
                onSelect={() => {
                  if (option === "None") {
                    set("areas_to_avoid", data.areas_to_avoid.includes("None") ? [] : ["None"])
                  } else {
                    toggleArray("areas_to_avoid", option)
                    if (data.areas_to_avoid.includes("None")) {
                      set("areas_to_avoid", data.areas_to_avoid.filter(v => v !== "None").concat(option))
                    }
                  }
                }}
                multi
              />
            ))}
          </Step>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
            Back
          </Button>
        )}
        {step < TOTAL_STEPS ? (
          <Button
            className="flex-1"
            disabled={!canAdvance}
            onClick={() => setStep(s => s + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button className="flex-1" onClick={handleSubmit}>
            {step === 8 && !data.body_fat_percentage ? "Skip" : "Finish"}
          </Button>
        )}
      </div>
    </div>
  )
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function OptionCard({
  label,
  selected,
  onSelect,
  multi = false,
}: {
  label: string
  selected: boolean
  onSelect: () => void
  multi?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left px-4 py-4 rounded-xl border text-sm font-medium transition-colors",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card hover:bg-muted"
      )}
    >
      {label}
    </button>
  )
}