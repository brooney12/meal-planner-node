import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { MealEntryResponse, Meal } from '../types'
import {
  authApi,
  getCurrentWeekLabel,
  shiftWeek,
  weekRangeLabel,
  entriesToWeekPlan,
} from './api'

// ── localStorage helpers ──────────────────────────────────────────────────────
beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

// ── authApi ───────────────────────────────────────────────────────────────────
describe('authApi.isLoggedIn', () => {
  it('returns false when no token in localStorage', () => {
    expect(authApi.isLoggedIn()).toBe(false)
  })

  it('returns true when token is present', () => {
    localStorage.setItem('mp_token', 'some.jwt.token')
    expect(authApi.isLoggedIn()).toBe(true)
  })
})

describe('authApi.logout', () => {
  it('removes token and username from localStorage', () => {
    localStorage.setItem('mp_token', 'some.jwt.token')
    localStorage.setItem('mp_username', 'alice')
    authApi.logout()
    expect(localStorage.getItem('mp_token')).toBeNull()
    expect(localStorage.getItem('mp_username')).toBeNull()
  })
})

describe('authApi.login', () => {
  it('stores token and username in localStorage on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: 'tok123', username: 'alice' }),
    }))

    const result = await authApi.login('alice', 'password')
    expect(result).toEqual({ token: 'tok123', username: 'alice' })
    expect(localStorage.getItem('mp_token')).toBe('tok123')
    expect(localStorage.getItem('mp_username')).toBe('alice')
  })

  it('throws when the server returns an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid credentials' }),
    }))

    await expect(authApi.login('alice', 'wrong')).rejects.toThrow('Invalid credentials')
  })
})

describe('authApi.register', () => {
  it('stores token and username in localStorage on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: 'newtok', username: 'bob' }),
    }))

    const result = await authApi.register('bob', 'bob@example.com', 'pass')
    expect(result).toEqual({ token: 'newtok', username: 'bob' })
    expect(localStorage.getItem('mp_token')).toBe('newtok')
    expect(localStorage.getItem('mp_username')).toBe('bob')
  })
})

// ── getCurrentWeekLabel ───────────────────────────────────────────────────────
describe('getCurrentWeekLabel', () => {
  it('returns a string matching YYYY-WNN format', () => {
    expect(getCurrentWeekLabel()).toMatch(/^\d{4}-W\d{2}$/)
  })
})

// ── shiftWeek ─────────────────────────────────────────────────────────────────
describe('shiftWeek', () => {
  it('shifts forward by one week', () => {
    expect(shiftWeek('2026-W10', 1)).toBe('2026-W11')
  })

  it('shifts backward by one week', () => {
    expect(shiftWeek('2026-W10', -1)).toBe('2026-W09')
  })

  it('handles year boundary forward (W52 → W01 next year)', () => {
    const result = shiftWeek('2025-W52', 1)
    expect(result).toMatch(/^2026-W0[12]$/) // ISO weeks can land on W01 or W02
  })

  it('handles year boundary backward (W01 → last week of prev year)', () => {
    const result = shiftWeek('2026-W01', -1)
    expect(result).toMatch(/^2025-W5[123]$/)
  })

  it('shifts by multiple weeks', () => {
    expect(shiftWeek('2026-W10', 3)).toBe('2026-W13')
    expect(shiftWeek('2026-W10', -3)).toBe('2026-W07')
  })
})

// ── weekRangeLabel ────────────────────────────────────────────────────────────
describe('weekRangeLabel', () => {
  it('returns a formatted date range string', () => {
    // 2026-W10 is Mon Mar 2 – Sun Mar 8
    const label = weekRangeLabel('2026-W10')
    expect(label).toBe('Mar 2 – Mar 8')
  })

  it('includes start and end of week separated by –', () => {
    const label = weekRangeLabel('2026-W01')
    expect(label).toContain('–')
    const parts = label.split(' – ')
    expect(parts).toHaveLength(2)
  })
})

// ── entriesToWeekPlan ─────────────────────────────────────────────────────────
const sampleMeal: Meal = { id: 1, name: 'Oats', emoji: '🥣', calories: 300, protein: 10, carbs: 50, fat: 5 }

describe('entriesToWeekPlan', () => {
  it('returns a plan with all days and meal types defaulting to null', () => {
    const plan = entriesToWeekPlan([])
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const types = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
    for (const d of days) {
      for (const t of types) {
        expect(plan[d][t]).toBeNull()
      }
    }
  })

  it('populates the correct slot when given an entry', () => {
    const entry: MealEntryResponse = { id: 1, dayOfWeek: 'Mon', mealType: 'Breakfast', weekLabel: '2026-W10', meal: sampleMeal }
    const plan = entriesToWeekPlan([entry])
    expect(plan['Mon']['Breakfast']).toEqual(sampleMeal)
    expect(plan['Mon']['Lunch']).toBeNull()
  })

  it('handles multiple entries across different days', () => {
    const entries: MealEntryResponse[] = [
      { id: 1, dayOfWeek: 'Mon', mealType: 'Breakfast', weekLabel: '2026-W10', meal: sampleMeal },
      { id: 2, dayOfWeek: 'Wed', mealType: 'Dinner', weekLabel: '2026-W10', meal: { ...sampleMeal, id: 2 } },
    ]
    const plan = entriesToWeekPlan(entries)
    expect(plan['Mon']['Breakfast']).toEqual(sampleMeal)
    expect(plan['Wed']['Dinner']).toMatchObject({ id: 2 })
    expect(plan['Wed']['Breakfast']).toBeNull()
  })
})
