import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Meal } from '../types'
import MealPickerModal from './MealPickerModal'

const meals: Meal[] = [
  { id: 1, name: 'Oatmeal', emoji: '🥣', calories: 300, protein: 10, carbs: 50, fat: 5 },
  { id: 2, name: 'Chicken Salad', emoji: '🥗', calories: 450, protein: 40, carbs: 15, fat: 18 },
  { id: 3, name: 'Banana', emoji: '🍌', calories: 90, protein: 1, carbs: 23, fat: 0 },
]

const defaultProps = {
  day: 'Mon' as const,
  mealType: 'Breakfast' as const,
  meals,
  onSelect: vi.fn(),
  onClose: vi.fn(),
}

function renderModal(props = defaultProps) {
  return render(<MealPickerModal {...props} />)
}

describe('MealPickerModal', () => {
  it('renders the day and meal type heading', () => {
    renderModal()
    expect(screen.getByText('Mon · Breakfast')).toBeInTheDocument()
  })

  it('renders all meals', () => {
    renderModal()
    expect(screen.getByText('Oatmeal')).toBeInTheDocument()
    expect(screen.getByText('Chicken Salad')).toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
  })

  it('focuses the search input on mount', () => {
    renderModal()
    expect(screen.getByPlaceholderText('Search meals...')).toHaveFocus()
  })

  it('filters meals by search query', async () => {
    renderModal()
    const input = screen.getByPlaceholderText('Search meals...')
    await userEvent.type(input, 'chicken')
    expect(screen.getByText('Chicken Salad')).toBeInTheDocument()
    expect(screen.queryByText('Oatmeal')).not.toBeInTheDocument()
    expect(screen.queryByText('Banana')).not.toBeInTheDocument()
  })

  it('shows empty state when no meals match the query', async () => {
    renderModal()
    const input = screen.getByPlaceholderText('Search meals...')
    await userEvent.type(input, 'zzz')
    expect(screen.getByText(/No meals match/i)).toBeInTheDocument()
  })

  it('calls onSelect and onClose when a meal is clicked', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<MealPickerModal {...defaultProps} onSelect={onSelect} onClose={onClose} />)
    fireEvent.click(screen.getByText('Oatmeal'))
    expect(onSelect).toHaveBeenCalledWith(meals[0])
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<MealPickerModal {...defaultProps} onClose={onClose} />)
    // The outermost div is the backdrop
    fireEvent.click(container.firstChild!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<MealPickerModal {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when clicking inside the modal', () => {
    const onClose = vi.fn()
    renderModal({ ...defaultProps, onClose })
    // Click the inner modal div (not backdrop)
    fireEvent.click(screen.getByText('Choose a meal'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('displays macro info for each meal', () => {
    renderModal()
    expect(screen.getByText(/300 kcal/)).toBeInTheDocument()
    expect(screen.getByText(/40g protein/)).toBeInTheDocument()
  })
})
