import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

vi.mock('./context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('./pages/AuthPage', () => ({
  default: () => <div>AuthPage</div>,
}))

vi.mock('./pages/PlannerPage', () => ({
  default: () => <div>PlannerPage</div>,
}))

import { useAuth } from './context/AuthContext'

const baseCtx = { login: vi.fn(), register: vi.fn(), logout: vi.fn() }

beforeEach(() => vi.clearAllMocks())

describe('App', () => {
  it('renders AuthPage when user is not logged in', () => {
    vi.mocked(useAuth).mockReturnValue({ ...baseCtx, user: null })
    render(<App />)
    expect(screen.getByText('AuthPage')).toBeInTheDocument()
    expect(screen.queryByText('PlannerPage')).not.toBeInTheDocument()
  })

  it('renders the header and PlannerPage when user is logged in', () => {
    vi.mocked(useAuth).mockReturnValue({ ...baseCtx, user: { username: 'alice' } })
    render(<App />)
    expect(screen.getByText('PlannerPage')).toBeInTheDocument()
    expect(screen.getByText('👤 alice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('calls logout when the Log out button is clicked', () => {
    const logout = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ ...baseCtx, logout, user: { username: 'alice' } })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(logout).toHaveBeenCalledOnce()
  })
})
