import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Meal, MealEntryResponse } from '../types'
import PlannerPage from './PlannerPage'

// ── Mock api module ───────────────────────────────────────────────────────────
vi.mock('../services/api', () => ({
  mealsApi: { getAll: vi.fn() },
  planApi: {
    getWeek: vi.fn(),
    setSlot: vi.fn(),
    clearSlot: vi.fn(),
    bulkSet: vi.fn(),
  },
  entriesToWeekPlan: vi.fn(),
  getCurrentWeekLabel: vi.fn(),
  shiftWeek: vi.fn(),
  weekRangeLabel: vi.fn(),
}))

// ── Mock MealPickerModal ──────────────────────────────────────────────────────
vi.mock('../components/MealPickerModal', () => ({
  default: ({ onSelect, onClose }: { onSelect: (m: Meal) => void; onClose: () => void }) => (
    <div data-testid="meal-picker">
      <button onClick={() => onSelect({ id: 99, name: 'Test Meal', emoji: '🥗', calories: 400, protein: 20, carbs: 30, fat: 10 })}>
        Pick meal
      </button>
      <button onClick={onClose}>Close picker</button>
    </div>
  ),
}))

import { mealsApi, planApi, entriesToWeekPlan, getCurrentWeekLabel, shiftWeek, weekRangeLabel } from '../services/api'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const sampleMeals: Meal[] = [
  { id: 1, name: 'Oatmeal', emoji: '🥣', calories: 300, protein: 10, carbs: 50, fat: 5 },
  { id: 2, name: 'Chicken', emoji: '🍗', calories: 400, protein: 35, carbs: 10, fat: 15 },
]

function emptyPlan(): Record<string, Record<string, Meal | null>> {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const types = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
  const p: Record<string, Record<string, Meal | null>> = {}
  for (const d of days) {
    p[d] = {}
    for (const t of types) p[d][t] = null
  }
  return p
}

function planWithMeal(day: string, mealType: string, meal: Meal) {
  const p = emptyPlan()
  p[day][mealType] = meal
  return p
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(mealsApi.getAll).mockResolvedValue(sampleMeals)
  vi.mocked(planApi.getWeek).mockResolvedValue([])
  vi.mocked(planApi.setSlot).mockResolvedValue({} as MealEntryResponse)
  vi.mocked(planApi.clearSlot).mockResolvedValue({ message: 'cleared' })
  vi.mocked(planApi.bulkSet).mockResolvedValue([])
  vi.mocked(entriesToWeekPlan).mockReturnValue(emptyPlan())
  vi.mocked(getCurrentWeekLabel).mockReturnValue('2026-W10')
  vi.mocked(weekRangeLabel).mockReturnValue('Mar 2 – Mar 8')
  vi.mocked(shiftWeek).mockImplementation((label: string, delta: number) => {
    const [year, wStr] = label.split('-W')
    const w = parseInt(wStr) + delta
    return `${year}-W${String(w).padStart(2, '0')}`
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────
async function renderAndWait() {
  render(<PlannerPage />)
  // Wait for loading to finish — all 4 empty-slot + buttons appear
  await screen.findAllByRole('button', { name: '+' })
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('PlannerPage rendering', () => {
  it('shows the week date range label', async () => {
    render(<PlannerPage />)
    expect(screen.getByText('Mar 2 – Mar 8')).toBeInTheDocument()
  })

  it('shows the current week label badge', async () => {
    render(<PlannerPage />)
    expect(screen.getByText('2026-W10')).toBeInTheDocument()
  })

  it('renders all 7 day tabs', async () => {
    render(<PlannerPage />)
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${day}`) })).toBeInTheDocument()
    }
  })

  it('renders 4 empty meal-slot + buttons after loading', async () => {
    await renderAndWait()
    expect(screen.getAllByRole('button', { name: '+' })).toHaveLength(4)
  })

  it('calls mealsApi.getAll and planApi.getWeek on mount', async () => {
    await renderAndWait()
    expect(mealsApi.getAll).toHaveBeenCalledOnce()
    expect(planApi.getWeek).toHaveBeenCalledWith('2026-W10')
  })
})

describe('PlannerPage day navigation', () => {
  it('switches the selected day when a day tab is clicked', async () => {
    await renderAndWait()
    fireEvent.click(screen.getByRole('button', { name: /^Wed/ }))
    // The nutrition heading updates to reflect the new day
    expect(screen.getByText(/Wed · Nutrition/i)).toBeInTheDocument()
  })
})

describe('PlannerPage week navigation', () => {
  it('shows previous week label after clicking ‹', async () => {
    await renderAndWait()
    fireEvent.click(screen.getByRole('button', { name: '‹' }))
    await waitFor(() => {
      expect(screen.getByText('2026-W09')).toBeInTheDocument()
    })
  })

  it('shows next week label after clicking ›', async () => {
    await renderAndWait()
    fireEvent.click(screen.getByRole('button', { name: '›' }))
    await waitFor(() => {
      expect(screen.getByText('2026-W11')).toBeInTheDocument()
    })
  })

  it('shows a Today button after navigating away from current week', async () => {
    await renderAndWait()
    fireEvent.click(screen.getByRole('button', { name: '‹' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
    })
  })

  it('returns to current week when Today is clicked', async () => {
    await renderAndWait()
    fireEvent.click(screen.getByRole('button', { name: '‹' }))
    await screen.findByRole('button', { name: 'Today' })
    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    await waitFor(() => {
      expect(screen.getByText('2026-W10')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
    })
  })

  it('loads the week plan on each week change', async () => {
    await renderAndWait()
    fireEvent.click(screen.getByRole('button', { name: '‹' }))
    await waitFor(() => {
      expect(planApi.getWeek).toHaveBeenCalledWith('2026-W09')
    })
  })
})

describe('PlannerPage meal picker', () => {
  it('opens the picker when the + button is clicked', async () => {
    await renderAndWait()
    fireEvent.click(screen.getAllByRole('button', { name: '+' })[0])
    expect(screen.getByTestId('meal-picker')).toBeInTheDocument()
  })

  it('closes the picker when onClose is called', async () => {
    await renderAndWait()
    fireEvent.click(screen.getAllByRole('button', { name: '+' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Close picker' }))
    expect(screen.queryByTestId('meal-picker')).not.toBeInTheDocument()
  })

  it('adds the selected meal to the plan and closes the picker', async () => {
    await renderAndWait()
    fireEvent.click(screen.getAllByRole('button', { name: '+' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Pick meal' }))
    await waitFor(() => {
      expect(screen.getAllByText('Test Meal').length).toBeGreaterThanOrEqual(1)
      expect(screen.queryByTestId('meal-picker')).not.toBeInTheDocument()
    })
  })

  it('calls planApi.setSlot when a meal is selected', async () => {
    await renderAndWait()
    fireEvent.click(screen.getAllByRole('button', { name: '+' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Pick meal' }))
    await waitFor(() => expect(planApi.setSlot).toHaveBeenCalledOnce())
  })
})

describe('PlannerPage meal removal', () => {
  it('renders a filled meal slot when plan data is provided', async () => {
    vi.mocked(entriesToWeekPlan).mockReturnValue(planWithMeal('Mon', 'Breakfast', sampleMeals[0]))
    await renderAndWait()
    expect(screen.getAllByText('Oatmeal').length).toBeGreaterThanOrEqual(1)
  })

  it('removes a meal when the × button is clicked', async () => {
    vi.mocked(entriesToWeekPlan).mockReturnValue(planWithMeal('Mon', 'Breakfast', sampleMeals[0]))
    await renderAndWait()
    fireEvent.click(screen.getByTitle('Remove'))
    await waitFor(() => {
      expect(screen.queryAllByText('Oatmeal')).toHaveLength(0)
    })
  })

  it('calls planApi.clearSlot when a meal is removed', async () => {
    vi.mocked(entriesToWeekPlan).mockReturnValue(planWithMeal('Mon', 'Breakfast', sampleMeals[0]))
    await renderAndWait()
    fireEvent.click(screen.getByTitle('Remove'))
    await waitFor(() => expect(planApi.clearSlot).toHaveBeenCalledOnce())
  })
})

describe('PlannerPage nutrition sidebar', () => {
  it('renders the daily nutrition section for the selected day', async () => {
    await renderAndWait()
    expect(screen.getByText(/Mon · Nutrition/i)).toBeInTheDocument()
  })

  it('renders macro bars (Protein, Carbs, Fat)', async () => {
    await renderAndWait()
    // 'Protein' appears in both the MacroBar and the Weekly totals row
    expect(screen.getAllByText('Protein').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Carbs').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Fat').length).toBeGreaterThanOrEqual(1)
  })

  it('renders weekly totals section', async () => {
    await renderAndWait()
    expect(screen.getByText('Weekly totals')).toBeInTheDocument()
    expect(screen.getByText('Calories')).toBeInTheDocument()
    expect(screen.getByText('Meals logged')).toBeInTheDocument()
  })

  it('shows Today\'s meals list when a meal is set on the selected day', async () => {
    vi.mocked(entriesToWeekPlan).mockReturnValue(planWithMeal('Mon', 'Breakfast', sampleMeals[0]))
    await renderAndWait()
    expect(screen.getByText("Today's meals")).toBeInTheDocument()
  })

  it('shows weekly avg when at least one meal is in the plan', async () => {
    const plan = emptyPlan()
    plan['Mon']['Breakfast'] = sampleMeals[0]
    plan['Mon']['Lunch'] = sampleMeals[1]
    vi.mocked(entriesToWeekPlan).mockReturnValue(plan)
    await renderAndWait()
    expect(screen.getByText('Weekly avg')).toBeInTheDocument()
  })
})

describe('PlannerPage generate button', () => {
  it('shows an error when generate is clicked without an API key', async () => {
    await renderAndWait()
    fireEvent.click(screen.getByRole('button', { name: /Generate week/i }))
    await waitFor(() => {
      expect(screen.getByText(/VITE_ANTHROPIC_API_KEY/i)).toBeInTheDocument()
    })
  })
})
