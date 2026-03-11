import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  onMealCreate: vi.fn().mockResolvedValue(undefined),
  onMealUpdate: vi.fn().mockResolvedValue(undefined),
  onMealDelete: vi.fn().mockResolvedValue(undefined),
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
    fireEvent.click(screen.getByText('Choose a meal'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('displays macro info for each meal', () => {
    renderModal()
    expect(screen.getByText(/300 kcal/)).toBeInTheDocument()
    expect(screen.getByText(/40g protein/)).toBeInTheDocument()
  })

  it('renders edit and delete buttons for each meal', () => {
    renderModal()
    expect(screen.getAllByRole('button', { name: /Edit /i })).toHaveLength(meals.length)
    expect(screen.getAllByRole('button', { name: /Delete /i })).toHaveLength(meals.length)
  })
})

describe('MealPickerModal — create meal', () => {
  it('shows the form when + New is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: '+ New' }))
    expect(screen.getByText('New Meal')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Emoji')).toBeInTheDocument()
  })

  it('hides the meal list when the form is open', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: '+ New' }))
    expect(screen.queryByText('Oatmeal')).not.toBeInTheDocument()
  })

  it('shows a validation error when name is empty on save', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: '+ New' }))
    await userEvent.type(screen.getByPlaceholderText('Emoji'), '🍎')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Name and emoji are required.')).toBeInTheDocument()
  })

  it('calls onMealCreate with form data and closes the form', async () => {
    const onMealCreate = vi.fn().mockResolvedValue(undefined)
    render(<MealPickerModal {...defaultProps} onMealCreate={onMealCreate} />)
    fireEvent.click(screen.getByRole('button', { name: '+ New' }))
    await userEvent.type(screen.getByPlaceholderText('Name'), 'Tuna Bowl')
    await userEvent.type(screen.getByPlaceholderText('Emoji'), '🐟')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(onMealCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tuna Bowl', emoji: '🐟' }))
    })
    await waitFor(() => expect(screen.queryByText('New Meal')).not.toBeInTheDocument())
  })

  it('dismisses the form when Cancel is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: '+ New' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('New Meal')).not.toBeInTheDocument()
  })

  it('closes the form on Escape instead of closing the modal', () => {
    const onClose = vi.fn()
    render(<MealPickerModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '+ New' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByText('New Meal')).not.toBeInTheDocument()
  })
})

describe('MealPickerModal — edit meal', () => {
  it('opens the edit form pre-filled when the edit button is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Oatmeal' }))
    expect(screen.getByText('Edit Meal')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Oatmeal')).toBeInTheDocument()
  })

  it('calls onMealUpdate with the meal id and new data', async () => {
    const onMealUpdate = vi.fn().mockResolvedValue(undefined)
    render(<MealPickerModal {...defaultProps} onMealUpdate={onMealUpdate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Oatmeal' }))
    const nameInput = screen.getByDisplayValue('Oatmeal')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Updated Oats')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(onMealUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Updated Oats' }))
    })
  })
})

describe('MealPickerModal — delete meal', () => {
  it('calls onMealDelete with the meal id when the delete button is clicked', async () => {
    const onMealDelete = vi.fn().mockResolvedValue(undefined)
    render(<MealPickerModal {...defaultProps} onMealDelete={onMealDelete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Oatmeal' }))
    await waitFor(() => {
      expect(onMealDelete).toHaveBeenCalledWith(1)
    })
  })
})
