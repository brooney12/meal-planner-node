"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// ── Database mock ─────────────────────────────────────────────────────────────
const { mockPrepare, mockGet, mockAll, mockRun, mockTransaction } = vitest_1.vi.hoisted(() => {
    const mockGet = vitest_1.vi.fn();
    const mockAll = vitest_1.vi.fn();
    const mockRun = vitest_1.vi.fn();
    const mockPrepare = vitest_1.vi.fn(() => ({ get: mockGet, all: mockAll, run: mockRun }));
    const mockTransaction = vitest_1.vi.fn((fn) => fn);
    return { mockPrepare, mockGet, mockAll, mockRun, mockTransaction };
});
vitest_1.vi.mock('../config/database', () => ({
    db: { prepare: mockPrepare, transaction: mockTransaction },
}));
const planController_1 = require("./planController");
// ── Helpers ───────────────────────────────────────────────────────────────────
const mockReq = (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    user: { id: 1, username: 'alice' },
    ...overrides,
});
const mockRes = () => {
    const res = {};
    res.status = vitest_1.vi.fn().mockReturnValue(res);
    res.json = vitest_1.vi.fn().mockReturnValue(res);
    return res;
};
const sampleMeal = {
    id: 5,
    name: 'Grilled Chicken',
    emoji: '🍗',
    calories: 350,
    protein: 40,
    carbs: 10,
    fat: 8,
};
// Row shape returned by the JOIN query in getWeekPlan
const sampleRow = {
    id: 10,
    user_id: 1,
    meal_id: 5,
    day_of_week: 'Mon',
    meal_type: 'Lunch',
    week_label: '2026-W10',
    m_id: 5,
    name: 'Grilled Chicken',
    emoji: '🍗',
    calories: 350,
    protein: 40,
    carbs: 10,
    fat: 8,
};
const validSlotBody = {
    dayOfWeek: 'Mon',
    mealType: 'Lunch',
    mealId: 5,
    weekLabel: '2026-W10',
};
// ── getWeekPlan ───────────────────────────────────────────────────────────────
(0, vitest_1.describe)('getWeekPlan', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('returns 400 when week query param is missing', () => {
        const req = mockReq({ query: {} });
        const res = mockRes();
        (0, planController_1.getWeekPlan)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
            error: 'week query param required (e.g. 2026-W10)',
        });
        (0, vitest_1.expect)(mockPrepare).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns formatted entries for the given week', () => {
        mockAll.mockReturnValue([sampleRow]);
        const req = mockReq({ query: { week: '2026-W10' } });
        const res = mockRes();
        (0, planController_1.getWeekPlan)(req, res);
        (0, vitest_1.expect)(mockAll).toHaveBeenCalledWith(1, '2026-W10');
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([
            {
                id: 10,
                dayOfWeek: 'Mon',
                mealType: 'Lunch',
                weekLabel: '2026-W10',
                meal: sampleMeal,
            },
        ]);
    });
    (0, vitest_1.it)('returns an empty array when no entries exist for the week', () => {
        mockAll.mockReturnValue([]);
        const req = mockReq({ query: { week: '2026-W01' } });
        const res = mockRes();
        (0, planController_1.getWeekPlan)(req, res);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
        (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
    });
});
// ── setSlot ───────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('setSlot', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('returns 400 when body fails Zod validation', () => {
        const req = mockReq({ body: { dayOfWeek: 'InvalidDay', mealType: 'Lunch', mealId: 5, weekLabel: '2026-W10' } });
        const res = mockRes();
        (0, planController_1.setSlot)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.anything() }));
        (0, vitest_1.expect)(mockRun).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 400 when weekLabel format is invalid', () => {
        const req = mockReq({ body: { ...validSlotBody, weekLabel: '2026/W10' } });
        const res = mockRes();
        (0, planController_1.setSlot)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, vitest_1.expect)(mockRun).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('clears the slot and returns a confirmation when mealId is null', () => {
        mockRun.mockReturnValue({});
        const req = mockReq({ body: { ...validSlotBody, mealId: null } });
        const res = mockRes();
        (0, planController_1.setSlot)(req, res);
        (0, vitest_1.expect)(mockRun).toHaveBeenCalledOnce(); // only the DELETE
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ message: 'Slot cleared' });
        (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 404 when the meal does not exist', () => {
        mockRun.mockReturnValue({}); // DELETE
        mockGet.mockReturnValue(null); // getMealOrFail → not found
        const req = mockReq({ body: validSlotBody });
        const res = mockRes();
        (0, planController_1.setSlot)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Meal not found' });
    });
    (0, vitest_1.it)('inserts the entry and returns the formatted slot on success', () => {
        mockRun.mockReturnValue({ lastInsertRowid: 42 }); // DELETE + INSERT
        mockGet.mockReturnValue(sampleMeal); // getMealOrFail
        const req = mockReq({ body: validSlotBody });
        const res = mockRes();
        (0, planController_1.setSlot)(req, res);
        (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
            id: 42,
            dayOfWeek: 'Mon',
            mealType: 'Lunch',
            weekLabel: '2026-W10',
            meal: sampleMeal,
        });
    });
});
// ── bulkSetWeek ───────────────────────────────────────────────────────────────
(0, vitest_1.describe)('bulkSetWeek', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('returns 400 when body fails Zod validation', () => {
        const req = mockReq({ body: { weekLabel: 'bad-label', entries: [] } });
        const res = mockRes();
        (0, planController_1.bulkSetWeek)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.anything() }));
        (0, vitest_1.expect)(mockTransaction).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('skips entries where the meal does not exist and returns empty array', () => {
        mockGet.mockReturnValue(undefined); // getMealOrFail → not found
        const req = mockReq({
            body: {
                weekLabel: '2026-W10',
                entries: [{ dayOfWeek: 'Mon', mealType: 'Lunch', mealId: 99 }],
            },
        });
        const res = mockRes();
        (0, planController_1.bulkSetWeek)(req, res);
        (0, vitest_1.expect)(mockRun).not.toHaveBeenCalled();
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
    });
    (0, vitest_1.it)('inserts valid entries and returns formatted results', () => {
        mockGet.mockReturnValue(sampleMeal);
        mockRun.mockReturnValue({ lastInsertRowid: 10 });
        const req = mockReq({
            body: {
                weekLabel: '2026-W10',
                entries: [{ dayOfWeek: 'Mon', mealType: 'Lunch', mealId: 5 }],
            },
        });
        const res = mockRes();
        (0, planController_1.bulkSetWeek)(req, res);
        (0, vitest_1.expect)(mockTransaction).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([
            {
                id: 10,
                dayOfWeek: 'Mon',
                mealType: 'Lunch',
                weekLabel: '2026-W10',
                meal: sampleMeal,
            },
        ]);
    });
    (0, vitest_1.it)('processes multiple entries and skips those with missing meals', () => {
        mockGet
            .mockReturnValueOnce(sampleMeal) // entry 1 — found
            .mockReturnValueOnce(undefined); // entry 2 — not found
        mockRun.mockReturnValue({ lastInsertRowid: 7 });
        const req = mockReq({
            body: {
                weekLabel: '2026-W10',
                entries: [
                    { dayOfWeek: 'Mon', mealType: 'Breakfast', mealId: 5 },
                    { dayOfWeek: 'Tue', mealType: 'Dinner', mealId: 99 },
                ],
            },
        });
        const res = mockRes();
        (0, planController_1.bulkSetWeek)(req, res);
        const result = vitest_1.vi.mocked(res.json).mock.calls[0][0];
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0]).toMatchObject({ dayOfWeek: 'Mon', mealType: 'Breakfast' });
    });
});
//# sourceMappingURL=planController.test.js.map