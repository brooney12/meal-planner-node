// src/services/api.ts
import type { AuthResponse, Meal, MealEntryResponse, DayOfWeek, MealType } from "../types";

const BASE = "http://localhost:8080/api";

function getToken(): string | null {
  return localStorage.getItem("mp_token");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem("mp_token");
    localStorage.removeItem("mp_username");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  if (!res.ok) throw new Error((data as { error: string }).error ?? "Request failed");
  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const data = await request<AuthResponse>("POST", "/auth/register", { username, email, password });
    localStorage.setItem("mp_token", data.token);
    localStorage.setItem("mp_username", data.username);
    return data;
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const data = await request<AuthResponse>("POST", "/auth/login", { username, password });
    localStorage.setItem("mp_token", data.token);
    localStorage.setItem("mp_username", data.username);
    return data;
  },

  logout: (): void => {
    localStorage.removeItem("mp_token");
    localStorage.removeItem("mp_username");
  },

  isLoggedIn: (): boolean => !!getToken(),
};

// ── Meals ─────────────────────────────────────────────────────────────────────
export const mealsApi = {
  getAll: (): Promise<Meal[]> => request<Meal[]>("GET", "/meals"),
};

// ── Meal Plan ─────────────────────────────────────────────────────────────────
export const planApi = {
  getWeek: (weekLabel: string): Promise<MealEntryResponse[]> =>
    request<MealEntryResponse[]>("GET", `/plan?week=${weekLabel}`),

  setSlot: (
    dayOfWeek: DayOfWeek,
    mealType: MealType,
    mealId: number,
    weekLabel: string
  ): Promise<MealEntryResponse> =>
    request<MealEntryResponse>("PUT", "/plan", { dayOfWeek, mealType, mealId, weekLabel }),

  clearSlot: (
    dayOfWeek: DayOfWeek,
    mealType: MealType,
    weekLabel: string
  ): Promise<{ message: string }> =>
    request<{ message: string }>("PUT", "/plan", { dayOfWeek, mealType, mealId: null, weekLabel }),

  bulkSet: (
    weekLabel: string,
    entries: { dayOfWeek: DayOfWeek; mealType: MealType; mealId: number }[]
  ): Promise<MealEntryResponse[]> =>
    request<MealEntryResponse[]>("PUT", "/plan/bulk", { weekLabel, entries }),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** ISO 8601 week number for a given date */
function isoWeekNumber(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

/** ISO year for the week (may differ from calendar year at year boundaries) */
function isoWeekYear(d: Date): number {
  const date = new Date(d.getTime());
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  return date.getFullYear();
}

export function getCurrentWeekLabel(): string {
  const now = new Date();
  return `${isoWeekYear(now)}-W${String(isoWeekNumber(now)).padStart(2, "0")}`;
}

/** Add/subtract weeks from a week label, e.g. shiftWeek("2026-W10", -1) → "2026-W09" */
export function shiftWeek(weekLabel: string, delta: number): string {
  const [yearStr, wStr] = weekLabel.split("-W");
  // Find the Monday of that ISO week
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  // Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  monday.setDate(monday.getDate() + delta * 7);
  return `${isoWeekYear(monday)}-W${String(isoWeekNumber(monday)).padStart(2, "0")}`;
}

/** Returns the Mon–Sun date range string for display, e.g. "Mar 2 – Mar 8" */
export function weekRangeLabel(weekLabel: string): string {
  const [yearStr, wStr] = weekLabel.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

/** Convert flat MealEntryResponse[] from API into the WeekPlan shape the UI uses */
export function entriesToWeekPlan(entries: MealEntryResponse[]): Record<string, Record<string, Meal | null>> {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];
  const plan: Record<string, Record<string, Meal | null>> = {};
  for (const d of DAYS) {
    plan[d] = {};
    for (const m of MEAL_TYPES) plan[d][m] = null;
  }
  for (const entry of entries) {
    if (plan[entry.dayOfWeek]) plan[entry.dayOfWeek][entry.mealType] = entry.meal;
  }
  return plan;
}
