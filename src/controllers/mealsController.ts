import { Request, Response } from "express";
import { z } from "zod";
import { db } from "../config/database";
import { Meal } from "../types";
import { logger } from "../config/logger";

const MealSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().min(1).max(10),
  calories: z.number().int().nonnegative(),
  protein: z.number().int().nonnegative(),
  carbs: z.number().int().nonnegative(),
  fat: z.number().int().nonnegative(),
});

export function getAllMeals(_req: Request, res: Response): void {
  const meals = db.prepare("SELECT * FROM meals ORDER BY id").all() as Meal[];
  res.json(meals);
}

export function getMealById(req: Request, res: Response): void {
  const meal = db
    .prepare("SELECT * FROM meals WHERE id = ?")
    .get(Number(req.params.id)) as Meal | undefined;

  if (!meal) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }
  res.json(meal);
}

export function createMeal(req: Request, res: Response): void {
  const parsed = MealSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, emoji, calories, protein, carbs, fat } = parsed.data;
  const result = db
    .prepare("INSERT INTO meals (name, emoji, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)")
    .run(name, emoji, calories, protein, carbs, fat);

  const meal = db
    .prepare("SELECT * FROM meals WHERE id = ?")
    .get(result.lastInsertRowid) as Meal;
  logger.info("Meal created", { mealId: meal.id, name: meal.name });
  res.status(201).json(meal);
}

export function updateMeal(req: Request, res: Response): void {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM meals WHERE id = ?").get(id) as Meal | undefined;
  if (!existing) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }

  const parsed = MealSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, emoji, calories, protein, carbs, fat } = parsed.data;
  db.prepare(
    "UPDATE meals SET name = ?, emoji = ?, calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?"
  ).run(name, emoji, calories, protein, carbs, fat, id);

  logger.info("Meal updated", { mealId: id, name });
  res.json({ id, ...parsed.data });
}

export function deleteMeal(req: Request, res: Response): void {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM meals WHERE id = ?").get(id) as Meal | undefined;
  if (!existing) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }

  db.transaction(() => {
    db.prepare("DELETE FROM meal_entries WHERE meal_id = ?").run(id);
    db.prepare("DELETE FROM meals WHERE id = ?").run(id);
  })();

  logger.info("Meal deleted", { mealId: id });
  res.json({ message: "Meal deleted" });
}
