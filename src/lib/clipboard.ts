export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  // Fallback for non-secure contexts (LAN HTTP on iPhone)
  const el = document.createElement("textarea")
  el.value = text
  el.style.cssText = "position:fixed;opacity:0;pointer-events:none"
  document.body.appendChild(el)
  el.select()
  document.execCommand("copy")
  document.body.removeChild(el)
}
