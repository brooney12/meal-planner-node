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

// ── bcryptjs mock ─────────────────────────────────────────────────────────────
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

// ── generateToken mock ────────────────────────────────────────────────────────
vi.mock('../middleware/auth', () => ({
  generateToken: vi.fn(() => 'mock.jwt.token'),
}))

import bcrypt from 'bcryptjs'
import { generateToken } from '../middleware/auth'
import { register, login, getMe } from './authController'
import { User } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: {},
  ...overrides,
})

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const sampleUser: User = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  password: '$2a$12$hashedpassword',
  created_at: '2026-01-01T00:00:00.000Z',
}

const validRegisterBody = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'secret123',
}

const validLoginBody = {
  username: 'alice',
  password: 'secret123',
}

// ── register ──────────────────────────────────────────────────────────────────
describe('register', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 201 with a token and username on success', async () => {
    mockGet.mockReturnValue(undefined) // no existing user
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed_pw' as never)
    mockRun.mockReturnValue({ lastInsertRowid: 1 })

    const req = mockReq({ body: validRegisterBody })
    const res = mockRes()

    await register(req as Request, res as Response)

    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 12)
    expect(mockRun).toHaveBeenCalledWith('alice', 'alice@example.com', 'hashed_pw')
    expect(generateToken).toHaveBeenCalledWith({ id: 1, username: 'alice' })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ token: 'mock.jwt.token', username: 'alice' })
  })

  it('returns 400 when username is too short', async () => {
    const req = mockReq({ body: { username: 'ab', email: 'a@b.com', password: 'secret123' } })
    const res = mockRes()

    await register(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.anything() }),
    )
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('returns 400 when email is invalid', async () => {
    const req = mockReq({ body: { username: 'alice', email: 'not-an-email', password: 'secret123' } })
    const res = mockRes()

    await register(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('returns 400 when password is too short', async () => {
    const req = mockReq({ body: { username: 'alice', email: 'alice@example.com', password: '123' } })
    const res = mockRes()

    await register(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('returns 400 when body is empty', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()

    await register(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('returns 409 when username or email already exists', async () => {
    mockGet.mockReturnValue(sampleUser) // existing user found

    const req = mockReq({ body: validRegisterBody })
    const res = mockRes()

    await register(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Username or email already taken' })
    expect(bcrypt.hash).not.toHaveBeenCalled()
  })
})

// ── login ─────────────────────────────────────────────────────────────────────
describe('login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with a token and username on valid credentials', async () => {
    mockGet.mockReturnValue(sampleUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const req = mockReq({ body: validLoginBody })
    const res = mockRes()

    await login(req as Request, res as Response)

    expect(bcrypt.compare).toHaveBeenCalledWith('secret123', sampleUser.password)
    expect(generateToken).toHaveBeenCalledWith({ id: 1, username: 'alice' })
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ token: 'mock.jwt.token', username: 'alice' })
  })

  it('returns 400 when body is missing required fields', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()

    await login(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid request' })
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('returns 401 when user does not exist', async () => {
    mockGet.mockReturnValue(undefined)

    const req = mockReq({ body: validLoginBody })
    const res = mockRes()

    await login(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid username or password' })
    expect(bcrypt.compare).not.toHaveBeenCalled()
  })

  it('returns 401 when password does not match', async () => {
    mockGet.mockReturnValue(sampleUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const req = mockReq({ body: validLoginBody })
    const res = mockRes()

    await login(req as Request, res as Response)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid username or password' })
    expect(generateToken).not.toHaveBeenCalled()
  })
})

// ── getMe ─────────────────────────────────────────────────────────────────────
describe('getMe', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the authenticated user id and username', () => {
    const req = mockReq({ user: { id: 1, username: 'alice' } })
    const res = mockRes()

    getMe(req as Request, res as Response)

    expect(res.json).toHaveBeenCalledWith({ id: 1, username: 'alice' })
    expect(res.status).not.toHaveBeenCalled()
  })
})
