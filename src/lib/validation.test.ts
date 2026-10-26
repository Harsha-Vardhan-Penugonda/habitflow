import { describe, expect, it } from 'vitest'
import { toHabitInput, validateEmail, validateHabit, validatePassword } from './validation'

const valid = { name: 'Read', description: '', category: 'learning', daily_goal: '', color: 'indigo' }

describe('validateHabit', () => {
  it('accepts a minimal habit', () => {
    expect(validateHabit(valid)).toEqual({})
  })

  it('requires a name and enforces length limits', () => {
    expect(validateHabit({ ...valid, name: '   ' }).name).toBeDefined()
    expect(validateHabit({ ...valid, name: 'x'.repeat(61) }).name).toBeDefined()
    expect(validateHabit({ ...valid, description: 'x'.repeat(281) }).description).toBeDefined()
    expect(validateHabit({ ...valid, daily_goal: 'x'.repeat(81) }).daily_goal).toBeDefined()
  })

  it('rejects unknown categories and colors', () => {
    expect(validateHabit({ ...valid, category: 'nope', color: 'black' })).toMatchObject({ category: expect.any(String), color: expect.any(String) })
  })
})

describe('toHabitInput', () => {
  it('trims text and turns empty optional fields into null', () => {
    expect(toHabitInput({ ...valid, name: '  Read  ', description: '  ', daily_goal: ' 20 pages ' })).toEqual({
      name: 'Read',
      description: null,
      category: 'learning',
      daily_goal: '20 pages',
      color: 'indigo',
    })
  })
})

describe('auth validation', () => {
  it('validates emails', () => {
    expect(validateEmail('')).toBeDefined()
    expect(validateEmail('nope')).toBeDefined()
    expect(validateEmail('student@example.com')).toBeUndefined()
  })

  it('validates passwords', () => {
    expect(validatePassword('')).toBeDefined()
    expect(validatePassword('short')).toBeDefined()
    expect(validatePassword('long-enough')).toBeUndefined()
  })
})
