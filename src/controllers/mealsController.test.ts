import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'

// ── Database mock ─────────────────────────────────────────────────────────────
const { mockPrepare, mockGet, mockAll, mockRun } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockAll = vi.fn();
  const mockRun = vi.fn();
  const mockPrepare = vi.fn(() => ({ get: mockGet, all: mockAll, run: mockRun }));
  return { mockPrepare, mockGet, mockAll, mockRun };
});

vi.mock("../config/database", () => ({
  db: { prepare: mockPrepare },
}));

import { getAllMeals, getMealById } from './mealsController'
import { Meal } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  params: {},
  ...overrides,
})

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const sampleMeal: Meal = {
  id: 1,
  name: 'Grilled Chicken',
  emoji: '🍗',
  calories: 350,
  protein: 40,
  carbs: 10,
  fat: 8,
}

// ── getAllMeals ────────────────────────────────────────────────────────────────
describe('getAllMeals', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns all meals as JSON', () => {
    mockAll.mockReturnValue([sampleMeal])
    const req = mockReq()
    const res = mockRes()

    getAllMeals(req as Request, res as Response)

    expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM meals ORDER BY id')
    expect(mockAll).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith([sampleMeal])
  })

  it('returns an empty array when no meals exist', () => {
    mockAll.mockReturnValue([])
    const req = mockReq()
    const res = mockRes()

    getAllMeals(req as Request, res as Response)

    expect(res.json).toHaveBeenCalledWith([])
  })

  it('does not send a non-200 status on success', () => {
    mockAll.mockReturnValue([sampleMeal])
    const req = mockReq()
    const res = mockRes()

    getAllMeals(req as Request, res as Response)

    expect(res.status).not.toHaveBeenCalled()
  })
})

// ── getMealById ───────────────────────────────────────────────────────────────
describe('getMealById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the meal as JSON when found', () => {
    mockGet.mockReturnValue(sampleMeal)
    const req = mockReq({ params: { id: '1' } })
    const res = mockRes()

    getMealById(req as Request, res as Response)

    expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM meals WHERE id = ?')
    expect(mockGet).toHaveBeenCalledWith(1)
    expect(res.json).toHaveBeenCalledWith(sampleMeal)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 404 with error message when meal is not found', () => {
    mockGet.mockReturnValue(undefined)
    const req = mockReq({ params: { id: '99' } })
    const res = mockRes()

    getMealById(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Meal not found' })
  })

  it('coerces the id param to a number when querying', () => {
    mockGet.mockReturnValue(sampleMeal)
    const req = mockReq({ params: { id: '42' } })
    const res = mockRes()

    getMealById(req as Request, res as Response)

    expect(mockGet).toHaveBeenCalledWith(42)
    expect(typeof (mockGet.mock.calls[0][0])).toBe('number')
  })
})
