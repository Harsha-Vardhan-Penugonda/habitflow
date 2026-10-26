import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'

// vite.config.ts blanks out the Supabase variables for tests, so this is
// exactly what a student sees before creating their .env.local file.
describe('App without configuration', () => {
  it('shows the setup screen and names the missing variables', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /connect your supabase project/i })).toBeInTheDocument()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('VITE_SUPABASE_URL')
    expect(alert).toHaveTextContent('VITE_SUPABASE_PUBLISHABLE_KEY')
    expect(screen.getByText(/restart the development server/i)).toBeInTheDocument()
  })
})
