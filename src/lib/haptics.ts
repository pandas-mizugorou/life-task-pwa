/** Light haptic feedback on supported devices (Android Chrome). No-op elsewhere. */
export function haptic(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  } catch {
    /* ignore */
  }
}

/** Normalize any thrown value to a display string. */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
