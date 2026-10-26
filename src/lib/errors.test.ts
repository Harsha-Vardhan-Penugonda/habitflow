import { describe, expect, it } from 'vitest'
import { authErrorMessage, CONFIRM_EMAIL_IS_ON, toAppError } from './errors'

describe('toAppError', () => {
  it('detects a database that has not been set up', () => {
    expect(toAppError({ code: 'PGRST205', message: "Could not find the table 'public.habits' in the schema cache" }).kind).toBe('database-not-ready')
  })

  it('detects network failures', () => {
    expect(toAppError(new TypeError('Failed to fetch')).kind).toBe('network')
  })

  it('detects an invalid API key', () => {
    expect(toAppError({ message: 'Invalid API key' }).kind).toBe('invalid-key')
  })

  it('keeps other messages', () => {
    const error = toAppError({ message: 'Something odd' })
    expect(error.kind).toBe('unknown')
    expect(error.message).toBe('Something odd')
  })
})

describe('authErrorMessage', () => {
  it('gives friendly messages for common auth errors', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('Incorrect email or password.')
    // Points at the Supabase setting instead of asking for a confirmation email.
    expect(authErrorMessage({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toBe(CONFIRM_EMAIL_IS_ON)
  })
})
