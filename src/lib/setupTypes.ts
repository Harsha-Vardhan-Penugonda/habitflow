/** Shapes shared by the setup form and the dev-server endpoint (dev/setupApi.ts). */

export const SETUP_ENDPOINT = '/__habitflow/setup'

export interface SetupRequest {
  url: string
  key: string
  databaseUrl?: string
  databasePassword?: string
}

export type StepStatus = 'ok' | 'error'

export interface SetupStep {
  id: 'validate' | 'connect' | 'email' | 'tables' | 'save'
  label: string
  status: StepStatus
  message: string
  /** Optional dashboard page that helps fix this step. */
  link?: { href: string; label: string }
}

export interface SetupResponse {
  ok: boolean
  steps: SetupStep[]
  /** True when .env.local is about to change, which restarts the dev server. */
  restarting: boolean
}
