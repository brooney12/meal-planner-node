import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'

// ── Database mock ─────────────────────────────────────────────────────────────
const { mockPrepare, mockGet, mockAll, mockRun, mockTransaction } = vi.hoisted(() => {
  const mockGet = vi.fn()
  const mockAll = vi.fn()
  const mockRun = vi.fn()
  const mockPrepare = vi.fn(() => ({ get: mockGet, all: mockAll, run: mockRun }))
  const mockTransaction = vi.fn((fn: () => void) => fn)
  return { mockPrepare, mockGet, mockAll, mockRun, mockTransaction }
})

vi.mock('../config/database', () => ({
  db: { prepare: mockPrepare, transaction: mockTransaction },
}))

import { getWeekPlan, setSlot, bulkSetWeek } from './planController'
import { Meal } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  user: { id: 1, username: 'alice' },
  ...overrides,
})

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const sampleMeal: Meal = {
  id: 5,
  name: 'Grilled Chicken',
  emoji: '🍗',
  calories: 350,
  protein: 40,
  carbs: 10,
  fat: 8,
}

// Row shape returned by the JOIN query in getWeekPlan
const sampleRow = {
  id: 10,
  user_id: 1,
  meal_id: 5,
  day_of_week: 'Mon',
  meal_type: 'Lunch',
  week_label: '2026-W10',
  m_id: 5,
  name: 'Grilled Chicken',
  emoji: '🍗',
  calories: 350,
  protein: 40,
  carbs: 10,
  fat: 8,
}

const validSlotBody = {
  dayOfWeek: 'Mon',
  mealType: 'Lunch',
  mealId: 5,
  weekLabel: '2026-W10',
}

// ── getWeekPlan ───────────────────────────────────────────────────────────────
describe('getWeekPlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when week query param is missing', () => {
    const req = mockReq({ query: {} })
    const res = mockRes()

    getWeekPlan(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'week query param required (e.g. 2026-W10)',
    })
    expect(mockPrepare).not.toHaveBeenCalled()
  })

  it('returns formatted entries for the given week', () => {
    mockAll.mockReturnValue([sampleRow])
    const req = mockReq({ query: { week: '2026-W10' } })
    const res = mockRes()

    getWeekPlan(req as Request, res as Response)

    expect(mockAll).toHaveBeenCalledWith(1, '2026-W10')
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 10,
        dayOfWeek: 'Mon',
        mealType: 'Lunch',
        weekLabel: '2026-W10',
        meal: sampleMeal,
      },
    ])
  })

  it('returns an empty array when no entries exist for the week', () => {
    mockAll.mockReturnValue([])
    const req = mockReq({ query: { week: '2026-W01' } })
    const res = mockRes()

    getWeekPlan(req as Request, res as Response)

    expect(res.json).toHaveBeenCalledWith([])
    expect(res.status).not.toHaveBeenCalled()
  })
})

// ── setSlot ───────────────────────────────────────────────────────────────────
describe('setSlot', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when body fails Zod validation', () => {
    const req = mockReq({ body: { dayOfWeek: 'InvalidDay', mealType: 'Lunch', mealId: 5, weekLabel: '2026-W10' } })
    const res = mockRes()

    setSlot(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.anything() }),
    )
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('returns 400 when weekLabel format is invalid', () => {
    const req = mockReq({ body: { ...validSlotBody, weekLabel: '2026/W10' } })
    const res = mockRes()

    setSlot(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('clears the slot and returns a confirmation when mealId is null', () => {
    mockRun.mockReturnValue({})
    const req = mockReq({ body: { ...validSlotBody, mealId: null } })
    const res = mockRes()

    setSlot(req as Request, res as Response)

    expect(mockRun).toHaveBeenCalledOnce() // only the DELETE
    expect(res.json).toHaveBeenCalledWith({ message: 'Slot cleared' })
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 404 when the meal does not exist', () => {
    mockRun.mockReturnValue({})   // DELETE
    mockGet.mockReturnValue(null) // getMealOrFail → not found

    const req = mockReq({ body: validSlotBody })
    const res = mockRes()

    setSlot(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Meal not found' })
  })

  it('inserts the entry and returns the formatted slot on success', () => {
    mockRun.mockReturnValue({ lastInsertRowid: 42 }) // DELETE + INSERT
    mockGet.mockReturnValue(sampleMeal)              // getMealOrFail

    const req = mockReq({ body: validSlotBody })
    const res = mockRes()

    setSlot(req as Request, res as Response)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      id: 42,
      dayOfWeek: 'Mon',
      mealType: 'Lunch',
      weekLabel: '2026-W10',
      meal: sampleMeal,
    })
  })
})

// ── bulkSetWeek ───────────────────────────────────────────────────────────────
describe('bulkSetWeek', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when body fails Zod validation', () => {
    const req = mockReq({ body: { weekLabel: 'bad-label', entries: [] } })
    const res = mockRes()

    bulkSetWeek(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.anything() }),
    )
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('skips entries where the meal does not exist and returns empty array', () => {
    mockGet.mockReturnValue(undefined) // getMealOrFail → not found

    const req = mockReq({
      body: {
        weekLabel: '2026-W10',
        entries: [{ dayOfWeek: 'Mon', mealType: 'Lunch', mealId: 99 }],
      },
    })
    const res = mockRes()

    bulkSetWeek(req as Request, res as Response)

    expect(mockRun).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith([])
  })

  it('inserts valid entries and returns formatted results', () => {
    mockGet.mockReturnValue(sampleMeal)
    mockRun.mockReturnValue({ lastInsertRowid: 10 })

    const req = mockReq({
      body: {
        weekLabel: '2026-W10',
        entries: [{ dayOfWeek: 'Mon', mealType: 'Lunch', mealId: 5 }],
      },
    })
    const res = mockRes()

    bulkSetWeek(req as Request, res as Response)

    expect(mockTransaction).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 10,
        dayOfWeek: 'Mon',
        mealType: 'Lunch',
        weekLabel: '2026-W10',
        meal: sampleMeal,
      },
    ])
  })

  it('processes multiple entries and skips those with missing meals', () => {
    mockGet
      .mockReturnValueOnce(sampleMeal)  // entry 1 — found
      .mockReturnValueOnce(undefined)   // entry 2 — not found
    mockRun.mockReturnValue({ lastInsertRowid: 7 })

    const req = mockReq({
      body: {
        weekLabel: '2026-W10',
        entries: [
          { dayOfWeek: 'Mon', mealType: 'Breakfast', mealId: 5 },
          { dayOfWeek: 'Tue', mealType: 'Dinner', mealId: 99 },
        ],
      },
    })
    const res = mockRes()

    bulkSetWeek(req as Request, res as Response)

    const result = vi.mocked(res.json!).mock.calls[0][0] as unknown[]
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ dayOfWeek: 'Mon', mealType: 'Breakfast' })
  })
})
