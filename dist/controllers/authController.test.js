"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// ── Database mock ─────────────────────────────────────────────────────────────
const { mockPrepare, mockGet, mockAll, mockRun } = vitest_1.vi.hoisted(() => {
    const mockGet = vitest_1.vi.fn();
    const mockAll = vitest_1.vi.fn();
    const mockRun = vitest_1.vi.fn();
    const mockPrepare = vitest_1.vi.fn(() => ({ get: mockGet, all: mockAll, run: mockRun }));
    return { mockPrepare, mockGet, mockAll, mockRun };
});
vitest_1.vi.mock("../config/database", () => ({
    db: { prepare: mockPrepare },
}));
// ── bcryptjs mock ─────────────────────────────────────────────────────────────
vitest_1.vi.mock('bcryptjs', () => ({
    default: {
        hash: vitest_1.vi.fn(),
        compare: vitest_1.vi.fn(),
    },
}));
// ── generateToken mock ────────────────────────────────────────────────────────
vitest_1.vi.mock('../middleware/auth', () => ({
    generateToken: vitest_1.vi.fn(() => 'mock.jwt.token'),
}));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const authController_1 = require("./authController");
// ── Helpers ───────────────────────────────────────────────────────────────────
const mockReq = (overrides = {}) => ({
    body: {},
    params: {},
    ...overrides,
});
const mockRes = () => {
    const res = {};
    res.status = vitest_1.vi.fn().mockReturnValue(res);
    res.json = vitest_1.vi.fn().mockReturnValue(res);
    return res;
};
const sampleUser = {
    id: 1,
    username: 'alice',
    email: 'alice@example.com',
    password: '$2a$12$hashedpassword',
    created_at: '2026-01-01T00:00:00.000Z',
};
const validRegisterBody = {
    username: 'alice',
    email: 'alice@example.com',
    password: 'secret123',
};
const validLoginBody = {
    username: 'alice',
    password: 'secret123',
};
// ── register ──────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('register', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('returns 201 with a token and username on success', async () => {
        mockGet.mockReturnValue(undefined); // no existing user
        vitest_1.vi.mocked(bcryptjs_1.default.hash).mockResolvedValue('hashed_pw');
        mockRun.mockReturnValue({ lastInsertRowid: 1 });
        const req = mockReq({ body: validRegisterBody });
        const res = mockRes();
        await (0, authController_1.register)(req, res);
        (0, vitest_1.expect)(bcryptjs_1.default.hash).toHaveBeenCalledWith('secret123', 12);
        (0, vitest_1.expect)(mockRun).toHaveBeenCalledWith('alice', 'alice@example.com', 'hashed_pw');
        (0, vitest_1.expect)(auth_1.generateToken).toHaveBeenCalledWith({ id: 1, username: 'alice' });
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ token: 'mock.jwt.token', username: 'alice' });
    });
    (0, vitest_1.it)('returns 400 when username is too short', async () => {
        const req = mockReq({ body: { username: 'ab', email: 'a@b.com', password: 'secret123' } });
        const res = mockRes();
        await (0, authController_1.register)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.anything() }));
        (0, vitest_1.expect)(mockRun).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 400 when email is invalid', async () => {
        const req = mockReq({ body: { username: 'alice', email: 'not-an-email', password: 'secret123' } });
        const res = mockRes();
        await (0, authController_1.register)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, vitest_1.expect)(mockRun).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 400 when password is too short', async () => {
        const req = mockReq({ body: { username: 'alice', email: 'alice@example.com', password: '123' } });
        const res = mockRes();
        await (0, authController_1.register)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, vitest_1.expect)(mockRun).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 400 when body is empty', async () => {
        const req = mockReq({ body: {} });
        const res = mockRes();
        await (0, authController_1.register)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, vitest_1.expect)(mockRun).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 409 when username or email already exists', async () => {
        mockGet.mockReturnValue(sampleUser); // existing user found
        const req = mockReq({ body: validRegisterBody });
        const res = mockRes();
        await (0, authController_1.register)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(409);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Username or email already taken' });
        (0, vitest_1.expect)(bcryptjs_1.default.hash).not.toHaveBeenCalled();
    });
});
// ── login ─────────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('login', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('returns 200 with a token and username on valid credentials', async () => {
        mockGet.mockReturnValue(sampleUser);
        vitest_1.vi.mocked(bcryptjs_1.default.compare).mockResolvedValue(true);
        const req = mockReq({ body: validLoginBody });
        const res = mockRes();
        await (0, authController_1.login)(req, res);
        (0, vitest_1.expect)(bcryptjs_1.default.compare).toHaveBeenCalledWith('secret123', sampleUser.password);
        (0, vitest_1.expect)(auth_1.generateToken).toHaveBeenCalledWith({ id: 1, username: 'alice' });
        (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ token: 'mock.jwt.token', username: 'alice' });
    });
    (0, vitest_1.it)('returns 400 when body is missing required fields', async () => {
        const req = mockReq({ body: {} });
        const res = mockRes();
        await (0, authController_1.login)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Invalid request' });
        (0, vitest_1.expect)(mockGet).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 401 when user does not exist', async () => {
        mockGet.mockReturnValue(undefined);
        const req = mockReq({ body: validLoginBody });
        const res = mockRes();
        await (0, authController_1.login)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Invalid username or password' });
        (0, vitest_1.expect)(bcryptjs_1.default.compare).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 401 when password does not match', async () => {
        mockGet.mockReturnValue(sampleUser);
        vitest_1.vi.mocked(bcryptjs_1.default.compare).mockResolvedValue(false);
        const req = mockReq({ body: validLoginBody });
        const res = mockRes();
        await (0, authController_1.login)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Invalid username or password' });
        (0, vitest_1.expect)(auth_1.generateToken).not.toHaveBeenCalled();
    });
});
// ── getMe ─────────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('getMe', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('returns the authenticated user id and username', () => {
        const req = mockReq({ user: { id: 1, username: 'alice' } });
        const res = mockRes();
        (0, authController_1.getMe)(req, res);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ id: 1, username: 'alice' });
        (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=authController.test.js.map