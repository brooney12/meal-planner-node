import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthPage from './AuthPage'

// ── Mock useAuth ──────────────────────────────────────────────────────────────
const mockLogin = vi.fn()
const mockRegister = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
    user: null,
    logout: vi.fn(),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderPage() {
  return render(<AuthPage />)
}

// ── Rendering ─────────────────────────────────────────────────────────────────
describe('AuthPage rendering', () => {
  it('renders the app title', () => {
    renderPage()
    expect(screen.getByText(/Meal Planner/i)).toBeInTheDocument()
  })

  it('shows Log in and Register tabs', () => {
    renderPage()
    // Both the tab and the submit button say "Log in" in login mode
    expect(screen.getAllByRole('button', { name: 'Log in' }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
  })

  it('defaults to login mode with no email field', () => {
    renderPage()
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Email/i)).not.toBeInTheDocument()
  })

  it('shows the email field after switching to register mode', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
  })
})

// ── Login flow ────────────────────────────────────────────────────────────────
describe('Login form', () => {
  it('calls login with username and password on submit', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderPage()

    await userEvent.type(screen.getByLabelText(/Username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/Password/i), 'secret')
    await userEvent.click(screen.getAllByRole('button', { name: 'Log in' }).slice(-1)[0])

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('alice', 'secret')
    })
  })

  it('shows an error message when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'))
    renderPage()

    await userEvent.type(screen.getByLabelText(/Username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/Password/i), 'wrong')
    await userEvent.click(screen.getAllByRole('button', { name: 'Log in' }).slice(-1)[0])

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })

  it('shows "Please wait…" while the request is in flight', async () => {
    let resolve!: () => void
    mockLogin.mockReturnValue(new Promise<void>((r) => { resolve = r }))
    renderPage()

    await userEvent.type(screen.getByLabelText(/Username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/Password/i), 'pass')
    await userEvent.click(screen.getAllByRole('button', { name: 'Log in' }).slice(-1)[0])

    expect(await screen.findByText('Please wait…')).toBeInTheDocument()
    resolve()
  })
})

// ── Register flow ─────────────────────────────────────────────────────────────
describe('Register form', () => {
  it('calls register with username, email and password on submit', async () => {
    mockRegister.mockResolvedValue(undefined)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    await userEvent.type(screen.getByLabelText(/Username/i), 'bob')
    await userEvent.type(screen.getByLabelText(/Email/i), 'bob@example.com')
    await userEvent.type(screen.getByLabelText(/Password/i), 'pass')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('bob', 'bob@example.com', 'pass')
    })
  })

  it('shows an error message when registration fails', async () => {
    mockRegister.mockRejectedValue(new Error('Username taken'))
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    await userEvent.type(screen.getByLabelText(/Username/i), 'bob')
    await userEvent.type(screen.getByLabelText(/Email/i), 'bob@example.com')
    await userEvent.type(screen.getByLabelText(/Password/i), 'pass')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Username taken')).toBeInTheDocument()
  })

  it('clears the error when switching tabs', async () => {
    mockLogin.mockRejectedValue(new Error('Bad creds'))
    renderPage()

    await userEvent.type(screen.getByLabelText(/Username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/Password/i), 'wrong')
    await userEvent.click(screen.getAllByRole('button', { name: 'Log in' }).slice(-1)[0])
    expect(await screen.findByText('Bad creds')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(screen.queryByText('Bad creds')).not.toBeInTheDocument()
  })
})
