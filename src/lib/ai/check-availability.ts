export type ChromeAIStatus = "available" | "downloading" | "unavailable"

export async function checkChromeAI(): Promise<ChromeAIStatus> {
  if (!("ai" in globalThis)) return "unavailable"
  try {
    const caps = await (globalThis as any).ai.languageModel.capabilities()
    if (caps.available === "readily") return "available"
    if (caps.available === "after-download") return "downloading"
  } catch {
    // API exists but threw — treat as unavailable
  }
  return "unavailable"
}

// Polls every 2s. Calls onTick each iteration (use for spinner updates).
// Returns 'available' when ready, 'timeout' after 60s.
export async function waitForChromeAI(onTick?: () => void): Promise<"available" | "timeout"> {
  const INTERVAL = 2000
  const TIMEOUT = 60_000
  const deadline = Date.now() + TIMEOUT
  while (Date.now() < deadline) {
    const status = await checkChromeAI()
    if (status === "available") return "available"
    onTick?.()
    await new Promise(r => setTimeout(r, INTERVAL))
  }
  return "timeout"
}
