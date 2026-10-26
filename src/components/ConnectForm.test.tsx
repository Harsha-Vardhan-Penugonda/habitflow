import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SetupResponse } from '../lib/setupTypes'
import { ConnectForm } from './ConnectForm'

async function fill(url: string, key: string) {
  await userEvent.type(screen.getByLabelText(/project url/i), url)
  await userEvent.type(screen.getByLabelText(/publishable key/i), key)
  await userEvent.click(screen.getByRole('button', { name: /check & connect/i }))
}

describe('ConnectForm', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('catches malformed values before contacting anything', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ConnectForm />)
    await fill('not-a-url', 'sb_secret_abc')
    expect(screen.getByText(/not a valid url/i)).toBeInTheDocument()
    expect(screen.getByText(/secret key/i)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('tells the user their values are correct when setup succeeds', async () => {
    const response: SetupResponse = {
      ok: true,
      restarting: false,
      steps: [
        { id: 'validate', label: 'Check the values', status: 'ok', message: 'Format ok.' },
        { id: 'connect', label: 'Connect to Supabase', status: 'ok', message: 'Connected.' },
        { id: 'tables', label: 'Set up the database', status: 'ok', message: 'Created the tables.' },
        { id: 'save', label: 'Save to .env.local', status: 'ok', message: 'Saved.' },
      ],
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<ConnectForm />)
    await fill('https://abcdefghijklmnop.supabase.co', 'sb_publishable_AbCdEf123456')

    expect(await screen.findByText(/your supabase values are correct/i)).toBeInTheDocument()
    expect(screen.getByText('Created the tables.')).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/__habitflow/setup')
    expect(JSON.parse(init.body)).toMatchObject({ url: 'https://abcdefghijklmnop.supabase.co', key: 'sb_publishable_AbCdEf123456' })
  })

  it('shows which step failed', async () => {
    const response: SetupResponse = {
      ok: false,
      restarting: false,
      steps: [
        { id: 'validate', label: 'Check the values', status: 'ok', message: 'Format ok.' },
        { id: 'connect', label: 'Connect to Supabase', status: 'error', message: 'Supabase rejected the key.' },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 })))
    render(<ConnectForm />)
    await fill('https://abcdefghijklmnop.supabase.co', 'sb_publishable_AbCdEf123456')
    expect(await screen.findByText('Supabase rejected the key.')).toBeInTheDocument()
    expect(screen.queryByText(/values are correct/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /check & connect/i })).toBeEnabled()
  })
})
