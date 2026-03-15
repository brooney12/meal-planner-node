import { Request, Response } from "express";
import { z } from "zod";
import { db } from "../config/database";
import { Meal, MealEntry } from "../types";
import { logger } from "../config/logger";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

function getMealOrFail(mealId: number): Meal | null {
  return db.prepare("SELECT * FROM meals WHERE id = ?").get(mealId) as Meal | null;
}

function formatEntry(entry: MealEntry & { meal?: Meal }) {
  return {
    id: entry.id,
    dayOfWeek: entry.day_of_week,
    mealType: entry.meal_type,
    weekLabel: entry.week_label,
    meal: entry.meal,
  };
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const SetSlotSchema = z.object({
  dayOfWeek: z.enum(DAYS),
  mealType: z.enum(MEAL_TYPES),
  mealId: z.number().int().positive().nullable(),
  weekLabel: z.string().regex(/^\d{4}-W\d{2}$/),
});

const BulkSchema = z.object({
  weekLabel: z.string().regex(/^\d{4}-W\d{2}$/),
  entries: z.array(
    z.object({
      dayOfWeek: z.enum(DAYS),
      mealType: z.enum(MEAL_TYPES),
      mealId: z.number().int().positive(),
    })
  ),
});

// ── Controllers ───────────────────────────────────────────────────────────────

export function getWeekPlan(req: Request, res: Response): void {
  const week = req.query.week as string;
  if (!week) {
    res.status(400).json({ error: "week query param required (e.g. 2026-W10)" });
    return;
  }

  const rows = db
    .prepare(`
      SELECT me.*, m.id as m_id, m.name, m.emoji, m.calories, m.protein, m.carbs, m.fat
      FROM meal_entries me
      JOIN meals m ON m.id = me.meal_id
      WHERE me.user_id = ? AND me.week_label = ?
    `)
    .all(req.user!.id, week) as any[];

  const result = rows.map((row) =>
    formatEntry({
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
    })
  );

  res.json(result);
}

export function setSlot(req: Request, res: Response): void {
  const parsed = SetSlotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { dayOfWeek, mealType, mealId, weekLabel } = parsed.data;
  const userId = req.user!.id;

  // Remove existing entry for this slot
  db.prepare(
    "DELETE FROM meal_entries WHERE user_id = ? AND day_of_week = ? AND meal_type = ? AND week_label = ?"
  ).run(userId, dayOfWeek, mealType, weekLabel);

  if (mealId === null) {
    logger.debug("Slot cleared", { userId, dayOfWeek, mealType, weekLabel });
    res.json({ message: "Slot cleared" });
    return;
  }

  const meal = getMealOrFail(mealId);
  if (!meal) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }

  const result = db
    .prepare(
      "INSERT INTO meal_entries (user_id, meal_id, day_of_week, meal_type, week_label) VALUES (?, ?, ?, ?, ?)"
    )
    .run(userId, mealId, dayOfWeek, mealType, weekLabel);

  res.json(
    formatEntry({
      id: result.lastInsertRowid as number,
      user_id: userId,
      meal_id: mealId,
      day_of_week: dayOfWeek,
      meal_type: mealType,
      week_label: weekLabel,
      meal,
    })
  );
}

export function bulkSetWeek(req: Request, res: Response): void {
  const parsed = BulkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { weekLabel, entries } = parsed.data;
  const userId = req.user!.id;

  const results: ReturnType<typeof formatEntry>[] = [];

  const run = db.transaction(() => {
    for (const entry of entries) {
      const meal = getMealOrFail(entry.mealId);
      if (!meal) continue;

      db.prepare(
        "DELETE FROM meal_entries WHERE user_id = ? AND day_of_week = ? AND meal_type = ? AND week_label = ?"
      ).run(userId, entry.dayOfWeek, entry.mealType, weekLabel);

      const ins = db
        .prepare(
          "INSERT INTO meal_entries (user_id, meal_id, day_of_week, meal_type, week_label) VALUES (?, ?, ?, ?, ?)"
        )
        .run(userId, entry.mealId, entry.dayOfWeek, entry.mealType, weekLabel);

      results.push(
        formatEntry({
          id: ins.lastInsertRowid as number,
          user_id: userId,
          meal_id: entry.mealId,
          day_of_week: entry.dayOfWeek,
          meal_type: entry.mealType,
          week_label: weekLabel,
          meal,
        })
      );
    }
  });

  run();
  logger.info("Bulk week set", { userId, weekLabel, count: results.length });
  res.json(results);
}
