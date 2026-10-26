/**
 * Remembers (in this browser only) that the visitor has answered the
 * "Are you new here?" question, so returning users go straight to log in.
 * Storage can be unavailable (e.g. private mode), so every access is guarded.
 */
const KEY = 'habitflow:welcome-done'

export function hasSeenWelcome(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function markWelcomeSeen(): void {
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {
    // Not fatal: the user will simply be asked again next time.
  }
}

const CONNECTED_KEY = 'habitflow:just-connected'

/** Set right before the dev server restarts with the new .env.local values. */
export function setJustConnected(): void {
  try {
    window.sessionStorage.setItem(CONNECTED_KEY, '1')
  } catch {
    // Only used for a success message, so this is not fatal.
  }
}

export function wasJustConnected(): boolean {
  try {
    return window.sessionStorage.getItem(CONNECTED_KEY) === '1'
  } catch {
    return false
  }
}

export function clearJustConnected(): void {
  try {
    window.sessionStorage.removeItem(CONNECTED_KEY)
  } catch {
    // Ignore.
  }
}
