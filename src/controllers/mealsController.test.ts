import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'

// ── Database mock ─────────────────────────────────────────────────────────────
const { mockPrepare, mockGet, mockAll, mockRun, mockTransaction } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockAll = vi.fn();
  const mockRun = vi.fn();
  const mockPrepare = vi.fn(() => ({ get: mockGet, all: mockAll, run: mockRun }));
  const mockTransaction = vi.fn((fn: () => void) => fn);
  return { mockPrepare, mockGet, mockAll, mockRun, mockTransaction };
});

vi.mock("../config/database", () => ({
  db: { prepare: mockPrepare, transaction: mockTransaction },
}));

import { getAllMeals, getMealById, createMeal, updateMeal, deleteMeal } from './mealsController'
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

// ── createMeal ────────────────────────────────────────────────────────────────
describe('createMeal', () => {
  const validBody = { name: 'Tuna Bowl', emoji: '🐟', calories: 420, protein: 38, carbs: 30, fat: 12 }

  beforeEach(() => vi.clearAllMocks())

  it('inserts the meal and returns 201 with the created meal', () => {
    mockRun.mockReturnValue({ lastInsertRowid: 5 })
    mockGet.mockReturnValue({ id: 5, ...validBody })
    const req = mockReq({ body: validBody })
    const res = mockRes()

    createMeal(req as Request, res as Response)

    expect(mockPrepare).toHaveBeenCalledWith(
      'INSERT INTO meals (name, emoji, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)'
    )
    expect(mockRun).toHaveBeenCalledWith('Tuna Bowl', '🐟', 420, 38, 30, 12)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ id: 5, ...validBody })
  })

  it('returns 400 when name is missing', () => {
    const req = mockReq({ body: { ...validBody, name: '' } })
    const res = mockRes()

    createMeal(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('returns 400 when calories is negative', () => {
    const req = mockReq({ body: { ...validBody, calories: -10 } })
    const res = mockRes()

    createMeal(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when emoji is missing', () => {
    const req = mockReq({ body: { ...validBody, emoji: '' } })
    const res = mockRes()

    createMeal(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ── updateMeal ────────────────────────────────────────────────────────────────
describe('updateMeal', () => {
  const validBody = { name: 'Updated Bowl', emoji: '🥙', calories: 500, protein: 42, carbs: 45, fat: 14 }

  beforeEach(() => vi.clearAllMocks())

  it('updates the meal and returns the updated data', () => {
    mockGet.mockReturnValue(sampleMeal)
    const req = mockReq({ params: { id: '1' }, body: validBody })
    const res = mockRes()

    updateMeal(req as Request, res as Response)

    expect(mockPrepare).toHaveBeenCalledWith(
      'UPDATE meals SET name = ?, emoji = ?, calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?'
    )
    expect(mockRun).toHaveBeenCalledWith('Updated Bowl', '🥙', 500, 42, 45, 14, 1)
    expect(res.json).toHaveBeenCalledWith({ id: 1, ...validBody })
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 404 when the meal does not exist', () => {
    mockGet.mockReturnValue(undefined)
    const req = mockReq({ params: { id: '99' }, body: validBody })
    const res = mockRes()

    updateMeal(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Meal not found' })
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('returns 400 when body fails validation', () => {
    mockGet.mockReturnValue(sampleMeal)
    const req = mockReq({ params: { id: '1' }, body: { ...validBody, name: '' } })
    const res = mockRes()

    updateMeal(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockRun).not.toHaveBeenCalled()
  })
})

// ── deleteMeal ────────────────────────────────────────────────────────────────
describe('deleteMeal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes the meal and returns a success message', () => {
    mockGet.mockReturnValue(sampleMeal)
    mockTransaction.mockImplementation((fn: () => void) => fn)
    const req = mockReq({ params: { id: '1' } })
    const res = mockRes()

    deleteMeal(req as Request, res as Response)

    expect(res.json).toHaveBeenCalledWith({ message: 'Meal deleted' })
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 404 when the meal does not exist', () => {
    mockGet.mockReturnValue(undefined)
    const req = mockReq({ params: { id: '99' } })
    const res = mockRes()

    deleteMeal(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Meal not found' })
  })

  it('calls transaction to cascade-delete plan entries before the meal', () => {
    mockGet.mockReturnValue(sampleMeal)
    mockTransaction.mockImplementation((fn: () => void) => fn)
    const req = mockReq({ params: { id: '1' } })
    const res = mockRes()

    deleteMeal(req as Request, res as Response)

    expect(mockTransaction).toHaveBeenCalled()
  })
})
