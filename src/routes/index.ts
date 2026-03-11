import { Router } from "express";
import { register, login, getMe } from "../controllers/authController";
import { getAllMeals, getMealById, createMeal, updateMeal, deleteMeal } from "../controllers/mealsController";
import { getWeekPlan, setSlot, bulkSetWeek } from "../controllers/planController";
import { authenticate } from "../middleware/auth";

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authRouter = Router();
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/me", authenticate, getMe);

// ── Meals ─────────────────────────────────────────────────────────────────────
export const mealsRouter = Router();
mealsRouter.get("/", getAllMeals);
mealsRouter.get("/:id", getMealById);
mealsRouter.post("/", authenticate, createMeal);
mealsRouter.put("/:id", authenticate, updateMeal);
mealsRouter.delete("/:id", authenticate, deleteMeal);

// ── Plan ──────────────────────────────────────────────────────────────────────
export const planRouter = Router();
planRouter.use(authenticate); // all plan routes require auth
planRouter.get("/", getWeekPlan);
planRouter.put("/", setSlot);
planRouter.put("/bulk", bulkSetWeek);
