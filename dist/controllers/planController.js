"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeekPlan = getWeekPlan;
exports.setSlot = setSlot;
exports.bulkSetWeek = bulkSetWeek;
const zod_1 = require("zod");
const database_1 = require("../config/database");
// ── Helpers ───────────────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];
function getMealOrFail(mealId) {
    return database_1.db.prepare("SELECT * FROM meals WHERE id = ?").get(mealId);
}
function formatEntry(entry) {
    return {
        id: entry.id,
        dayOfWeek: entry.day_of_week,
        mealType: entry.meal_type,
        weekLabel: entry.week_label,
        meal: entry.meal,
    };
}
// ── Schemas ───────────────────────────────────────────────────────────────────
const SetSlotSchema = zod_1.z.object({
    dayOfWeek: zod_1.z.enum(DAYS),
    mealType: zod_1.z.enum(MEAL_TYPES),
    mealId: zod_1.z.number().int().positive().nullable(),
    weekLabel: zod_1.z.string().regex(/^\d{4}-W\d{2}$/),
});
const BulkSchema = zod_1.z.object({
    weekLabel: zod_1.z.string().regex(/^\d{4}-W\d{2}$/),
    entries: zod_1.z.array(zod_1.z.object({
        dayOfWeek: zod_1.z.enum(DAYS),
        mealType: zod_1.z.enum(MEAL_TYPES),
        mealId: zod_1.z.number().int().positive(),
    })),
});
// ── Controllers ───────────────────────────────────────────────────────────────
function getWeekPlan(req, res) {
    const week = req.query.week;
    if (!week) {
        res.status(400).json({ error: "week query param required (e.g. 2026-W10)" });
        return;
    }
    const rows = database_1.db
        .prepare(`
      SELECT me.*, m.id as m_id, m.name, m.emoji, m.calories, m.protein, m.carbs, m.fat
      FROM meal_entries me
      JOIN meals m ON m.id = me.meal_id
      WHERE me.user_id = ? AND me.week_label = ?
    `)
        .all(req.user.id, week);
    const result = rows.map((row) => formatEntry({
        ...row,
        meal: {
            id: row.m_id,
            name: row.name,
            emoji: row.emoji,
            calories: row.calories,
            protein: row.protein,
            carbs: row.carbs,
            fat: row.fat,
        },
    }));
    res.json(result);
}
function setSlot(req, res) {
    const parsed = SetSlotSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten().fieldErrors });
        return;
    }
    const { dayOfWeek, mealType, mealId, weekLabel } = parsed.data;
    const userId = req.user.id;
    // Remove existing entry for this slot
    database_1.db.prepare("DELETE FROM meal_entries WHERE user_id = ? AND day_of_week = ? AND meal_type = ? AND week_label = ?").run(userId, dayOfWeek, mealType, weekLabel);
    if (mealId === null) {
        res.json({ message: "Slot cleared" });
        return;
    }
    const meal = getMealOrFail(mealId);
    if (!meal) {
        res.status(404).json({ error: "Meal not found" });
        return;
    }
    const result = database_1.db
        .prepare("INSERT INTO meal_entries (user_id, meal_id, day_of_week, meal_type, week_label) VALUES (?, ?, ?, ?, ?)")
        .run(userId, mealId, dayOfWeek, mealType, weekLabel);
    res.json(formatEntry({
        id: result.lastInsertRowid,
        user_id: userId,
        meal_id: mealId,
        day_of_week: dayOfWeek,
        meal_type: mealType,
        week_label: weekLabel,
        meal,
    }));
}
function bulkSetWeek(req, res) {
    const parsed = BulkSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten().fieldErrors });
        return;
    }
    const { weekLabel, entries } = parsed.data;
    const userId = req.user.id;
    const results = [];
    const run = database_1.db.transaction(() => {
        for (const entry of entries) {
            const meal = getMealOrFail(entry.mealId);
            if (!meal)
                continue;
            database_1.db.prepare("DELETE FROM meal_entries WHERE user_id = ? AND day_of_week = ? AND meal_type = ? AND week_label = ?").run(userId, entry.dayOfWeek, entry.mealType, weekLabel);
            const ins = database_1.db
                .prepare("INSERT INTO meal_entries (user_id, meal_id, day_of_week, meal_type, week_label) VALUES (?, ?, ?, ?, ?)")
                .run(userId, entry.mealId, entry.dayOfWeek, entry.mealType, weekLabel);
            results.push(formatEntry({
                id: ins.lastInsertRowid,
                user_id: userId,
                meal_id: entry.mealId,
                day_of_week: entry.dayOfWeek,
                meal_type: entry.mealType,
                week_label: weekLabel,
                meal,
            }));
        }
    });
    run();
    res.json(results);
}
//# sourceMappingURL=planController.js.map