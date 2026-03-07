// src/types.ts

export interface Meal {
  id: number;
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealEntryResponse {
  id: number;
  dayOfWeek: string;
  mealType: string;
  weekLabel: string;
  meal: Meal;
}

export interface AuthResponse {
  token: string;
  username: string;
}

export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export type WeekPlan = Record<DayOfWeek, Record<MealType, Meal | null>>;
