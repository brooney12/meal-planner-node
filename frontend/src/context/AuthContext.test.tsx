import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// ── Mock authApi ──────────────────────────────────────────────────────────────
vi.mock('../services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    isLoggedIn: vi.fn(() => false),
  },
}))

import { authApi } from '../services/api'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

// ── Helper component to expose context value ──────────────────────────────────
function TestConsumer({ onRender }: { onRender: (ctx: ReturnType<typeof useAuth>) => void }) {
  const ctx = useAuth()
  onRender(ctx)
  return null
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AuthProvider', () => {
  it('starts with user=null when not logged in', () => {
    vi.mocked(authApi.isLoggedIn).mockReturnValue(false)

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { captured = ctx }} />
      </AuthProvider>
    )
    expect(captured!.user).toBeNull()
  })

  it('starts with user populated when token and username exist in localStorage', () => {
    vi.mocked(authApi.isLoggedIn).mockReturnValue(true)
    localStorage.setItem('mp_username', 'alice')

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { captured = ctx }} />
      </AuthProvider>
    )
    expect(captured!.user).toEqual({ username: 'alice' })
  })

  it('sets user after successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ token: 'tok', username: 'alice' })

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { captured = ctx }} />
      </AuthProvider>
    )

    await act(async () => {
      await captured!.login('alice', 'password')
    })
    expect(captured!.user).toEqual({ username: 'alice' })
  })

  it('sets user after successful register', async () => {
    vi.mocked(authApi.register).mockResolvedValue({ token: 'tok', username: 'bob' })

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { captured = ctx }} />
      </AuthProvider>
    )

    await act(async () => {
      await captured!.register('bob', 'bob@example.com', 'pass')
    })
    expect(captured!.user).toEqual({ username: 'bob' })
  })

  it('clears user after logout', async () => {
    vi.mocked(authApi.isLoggedIn).mockReturnValue(true)
    localStorage.setItem('mp_username', 'alice')

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { captured = ctx }} />
      </AuthProvider>
    )

    act(() => {
      captured!.logout()
    })
    expect(authApi.logout).toHaveBeenCalledOnce()
    expect(captured!.user).toBeNull()
  })

  it('propagates login errors', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'))

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { captured = ctx }} />
      </AuthProvider>
    )

    await expect(
      act(async () => { await captured!.login('alice', 'wrong') })
    ).rejects.toThrow('Invalid credentials')
    expect(captured!.user).toBeNull()
  })
})

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer onRender={() => {}} />)).toThrow(
      'useAuth must be used within AuthProvider'
    )
    spy.mockRestore()
  })
})
