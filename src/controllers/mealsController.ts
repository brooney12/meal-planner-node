import { Request, Response } from "express";
import { db } from "../config/database";
import { Meal } from "../types";

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
