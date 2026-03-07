"use strict";
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
const mealsController_1 = require("./mealsController");
// ── Helpers ───────────────────────────────────────────────────────────────────
const mockReq = (overrides = {}) => ({
    params: {},
    ...overrides,
});
const mockRes = () => {
    const res = {};
    res.status = vitest_1.vi.fn().mockReturnValue(res);
    res.json = vitest_1.vi.fn().mockReturnValue(res);
    return res;
};
const sampleMeal = {
    id: 1,
    name: 'Grilled Chicken',
    emoji: '🍗',
    calories: 350,
    protein: 40,
    carbs: 10,
    fat: 8,
};
// ── getAllMeals ────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('getAllMeals', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('returns all meals as JSON', () => {
        mockAll.mockReturnValue([sampleMeal]);
        const req = mockReq();
        const res = mockRes();
        (0, mealsController_1.getAllMeals)(req, res);
        (0, vitest_1.expect)(mockPrepare).toHaveBeenCalledWith('SELECT * FROM meals ORDER BY id');
        (0, vitest_1.expect)(mockAll).toHaveBeenCalled();
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([sampleMeal]);
    });
    (0, vitest_1.it)('returns an empty array when no meals exist', () => {
        mockAll.mockReturnValue([]);
        const req = mockReq();
        const res = mockRes();
        (0, mealsController_1.getAllMeals)(req, res);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
    });
    (0, vitest_1.it)('does not send a non-200 status on success', () => {
        mockAll.mockReturnValue([sampleMeal]);
        const req = mockReq();
        const res = mockRes();
        (0, mealsController_1.getAllMeals)(req, res);
        (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
    });
});
// ── getMealById ───────────────────────────────────────────────────────────────
(0, vitest_1.describe)('getMealById', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('returns the meal as JSON when found', () => {
        mockGet.mockReturnValue(sampleMeal);
        const req = mockReq({ params: { id: '1' } });
        const res = mockRes();
        (0, mealsController_1.getMealById)(req, res);
        (0, vitest_1.expect)(mockPrepare).toHaveBeenCalledWith('SELECT * FROM meals WHERE id = ?');
        (0, vitest_1.expect)(mockGet).toHaveBeenCalledWith(1);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(sampleMeal);
        (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 404 with error message when meal is not found', () => {
        mockGet.mockReturnValue(undefined);
        const req = mockReq({ params: { id: '99' } });
        const res = mockRes();
        (0, mealsController_1.getMealById)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Meal not found' });
    });
    (0, vitest_1.it)('coerces the id param to a number when querying', () => {
        mockGet.mockReturnValue(sampleMeal);
        const req = mockReq({ params: { id: '42' } });
        const res = mockRes();
        (0, mealsController_1.getMealById)(req, res);
        (0, vitest_1.expect)(mockGet).toHaveBeenCalledWith(42);
        (0, vitest_1.expect)(typeof (mockGet.mock.calls[0][0])).toBe('number');
    });
});
//# sourceMappingURL=mealsController.test.js.map