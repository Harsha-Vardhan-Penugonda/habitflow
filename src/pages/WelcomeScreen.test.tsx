import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { hasSeenWelcome } from '../lib/onboarding'
import { WelcomeScreen } from './WelcomeScreen'

function renderWelcome() {
  render(
    <MemoryRouter initialEntries={['/welcome']}>
      <Routes>
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/signup" element={<p>Signup page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('WelcomeScreen', () => {
  beforeEach(() => localStorage.clear())

  it('asks first-time visitors whether they are new', () => {
    renderWelcome()
    expect(screen.getByText(/is this your first time here/i)).toBeInTheDocument()
    expect(hasSeenWelcome()).toBe(false)
  })

  it('shows the Supabase setup guide to new users', async () => {
    renderWelcome()
    await userEvent.click(screen.getByRole('button', { name: /yes, i'm new/i }))
    expect(screen.getByRole('heading', { name: /set up your supabase project/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/project url/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/publishable key/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /check & connect/i })).toBeInTheDocument()
  })

  it('sends returning users straight to log in and remembers the answer', async () => {
    renderWelcome()
    await userEvent.click(screen.getByRole('button', { name: /already set up supabase/i }))
    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(hasSeenWelcome()).toBe(true)
  })
})
