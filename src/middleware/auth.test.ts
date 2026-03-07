import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { generateToken, authenticate, JwtPayload } from './auth'

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const mockNext = (): NextFunction => vi.fn() as unknown as NextFunction

const samplePayload: JwtPayload = { id: 1, username: 'alice' }

// ── generateToken ─────────────────────────────────────────────────────────────
describe('generateToken', () => {
  it('returns a non-empty JWT string', () => {
    const token = generateToken(samplePayload)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // header.payload.signature
  })

  it('encodes the payload id and username', () => {
    import('jsonwebtoken').then(({ default: jwt }) => {
      const token = generateToken(samplePayload)
      const decoded = jwt.decode(token) as JwtPayload
      expect(decoded.id).toBe(samplePayload.id)
      expect(decoded.username).toBe(samplePayload.username)
    })
  })
})

// ── authenticate ──────────────────────────────────────────────────────────────
describe('authenticate', () => {
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    res = mockRes()
    next = mockNext()
  })

  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} } as Partial<Request>
    authenticate(req as Request, res as Response, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when Authorization header does not start with Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } } as Partial<Request>
    authenticate(req as Request, res as Response, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' })
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() and sets req.user for a valid token', () => {
    const token = generateToken(samplePayload)
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as Partial<Request>

    authenticate(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toEqual({ id: samplePayload.id, username: samplePayload.username })
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 when the token is invalid', () => {
    const req = {
      headers: { authorization: 'Bearer this.is.invalid' },
    } as Partial<Request>

    authenticate(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when the token is expired', async () => {
    const jwt = (await import('jsonwebtoken')).default
    const expiredToken = jwt.sign(
      { id: 1, username: 'alice' },
      process.env.JWT_SECRET ?? 'changeme',
      { expiresIn: -1 }
    )
    const req = {
      headers: { authorization: `Bearer ${expiredToken}` },
    } as Partial<Request>

    authenticate(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' })
    expect(next).not.toHaveBeenCalled()
  })
})
