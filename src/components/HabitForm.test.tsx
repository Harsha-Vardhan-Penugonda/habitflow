import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HabitForm } from './HabitForm'

describe('HabitForm', () => {
  it('shows a validation error instead of submitting an empty name', async () => {
    const onSubmit = vi.fn()
    render(<HabitForm onSubmit={onSubmit} onCancel={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /create habit/i }))
    expect(screen.getByText(/give your habit a name/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits cleaned-up values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<HabitForm onSubmit={onSubmit} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText(/^name/i), '  Drink water ')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'health')
    await userEvent.type(screen.getByLabelText(/daily goal/i), '8 glasses')
    await userEvent.click(screen.getByLabelText('emerald'))
    await userEvent.click(screen.getByRole('button', { name: /create habit/i }))
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Drink water',
      description: null,
      category: 'health',
      daily_goal: '8 glasses',
      color: 'emerald',
    })
  })

  it('shows the error when saving fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    render(<HabitForm onSubmit={onSubmit} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText(/^name/i), 'Read')
    await userEvent.click(screen.getByRole('button', { name: /create habit/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach supabase/i)
  })
})
