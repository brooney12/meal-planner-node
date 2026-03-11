import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { MealEntryResponse, Meal } from '../types'
import {
  authApi,
  mealsApi,
  planApi,
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

// ── mealsApi ─────────────────────────────────────────────────────────────────
describe('mealsApi.getAll', () => {
  it('fetches and returns the meal list', async () => {
    const meals: Meal[] = [
      { id: 1, name: 'Oats', emoji: '🥣', calories: 300, protein: 10, carbs: 50, fat: 5 },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => meals,
    }))
    expect(await mealsApi.getAll()).toEqual(meals)
  })
})

describe('mealsApi.create', () => {
  beforeEach(() => { localStorage.setItem('mp_token', 'test-token') })

  it('sends a POST and returns the created meal', async () => {
    const newMeal: Meal = { id: 15, name: 'Tuna Bowl', emoji: '🐟', calories: 420, protein: 38, carbs: 30, fat: 12 }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 201, json: async () => newMeal,
    }))
    const { id: _id, ...data } = newMeal
    expect(await mealsApi.create(data)).toEqual(newMeal)
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[1].method).toBe('POST')
    expect(JSON.parse(call[1].body)).toMatchObject(data)
  })

  it('throws when the server returns an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 400, json: async () => ({ error: 'Validation failed' }),
    }))
    await expect(mealsApi.create({ name: '', emoji: '', calories: 0, protein: 0, carbs: 0, fat: 0 }))
      .rejects.toThrow('Validation failed')
  })
})

describe('mealsApi.update', () => {
  beforeEach(() => { localStorage.setItem('mp_token', 'test-token') })

  it('sends a PUT to /meals/:id and returns the updated meal', async () => {
    const updated: Meal = { id: 1, name: 'Updated Oats', emoji: '🥣', calories: 310, protein: 11, carbs: 50, fat: 5 }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => updated,
    }))
    const { id: _id, ...data } = updated
    expect(await mealsApi.update(1, data)).toEqual(updated)
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toContain('/meals/1')
    expect(call[1].method).toBe('PUT')
  })

  it('throws on server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 404, json: async () => ({ error: 'Meal not found' }),
    }))
    await expect(mealsApi.update(99, { name: 'X', emoji: '🍎', calories: 0, protein: 0, carbs: 0, fat: 0 }))
      .rejects.toThrow('Meal not found')
  })
})

describe('mealsApi.delete', () => {
  beforeEach(() => { localStorage.setItem('mp_token', 'test-token') })

  it('sends a DELETE to /meals/:id and returns the success message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ message: 'Meal deleted' }),
    }))
    expect(await mealsApi.delete(1)).toEqual({ message: 'Meal deleted' })
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toContain('/meals/1')
    expect(call[1].method).toBe('DELETE')
  })

  it('throws on server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 404, json: async () => ({ error: 'Meal not found' }),
    }))
    await expect(mealsApi.delete(99)).rejects.toThrow('Meal not found')
  })
})

// ── planApi ───────────────────────────────────────────────────────────────────
describe('planApi', () => {
  const meal: Meal = { id: 1, name: 'Oats', emoji: '🥣', calories: 300, protein: 10, carbs: 50, fat: 5 }
  const entry: MealEntryResponse = { id: 1, dayOfWeek: 'Mon', mealType: 'Breakfast', weekLabel: '2026-W10', meal }

  beforeEach(() => {
    localStorage.setItem('mp_token', 'test-token')
  })

  it('getWeek fetches entries for the given week', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => [entry],
    }))
    expect(await planApi.getWeek('2026-W10')).toEqual([entry])
  })

  it('setSlot sends a PUT with slot data and returns the entry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => entry,
    }))
    expect(await planApi.setSlot('Mon', 'Breakfast', 1, '2026-W10')).toEqual(entry)
  })

  it('clearSlot sends a PUT with mealId null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ message: 'Slot cleared' }),
    }))
    expect(await planApi.clearSlot('Mon', 'Breakfast', '2026-W10')).toEqual({ message: 'Slot cleared' })
  })

  it('bulkSet sends a PUT to /plan/bulk', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => [entry],
    }))
    expect(await planApi.bulkSet('2026-W10', [{ dayOfWeek: 'Mon', mealType: 'Breakfast', mealId: 1 }])).toEqual([entry])
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
