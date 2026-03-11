import { useState, useEffect, useCallback } from "react";
import type { Meal, DayOfWeek, MealType } from "../types";
import {
  mealsApi,
  planApi,
  entriesToWeekPlan,
  getCurrentWeekLabel,
  shiftWeek,
  weekRangeLabel,
} from "../services/api";
import MealPickerModal from "../components/MealPickerModal";
import styles from "./PlannerPage.module.css";

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];
const GOALS = { cal: 2000, protein: 150, carbs: 200, fat: 65 };
const MEAL_LIBRARY_IDS = { Breakfast: [1, 2, 7, 10, 11], Snack: [11, 13, 14] };

type WeekPlan = Record<DayOfWeek, Record<MealType, Meal | null>>;

function emptyWeekPlan(): WeekPlan {
  const plan = {} as WeekPlan;
  for (const d of DAYS) plan[d] = { Breakfast: null, Lunch: null, Dinner: null, Snack: null };
  return plan;
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 12, height: 12,
      border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
      borderRadius: "50%", animation: "spin 0.7s linear infinite",
    }} />
  );
}

// ── Macro progress bar ─────────────────────────────────────────────────────────
function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={styles.macroBar}>
      <div className={styles.macroRow}>
        <span className={styles.macroLabel}>{label}</span>
        <span className={styles.macroValue}>{value}<span className={styles.macroMax}>/{max}</span></span>
      </div>
      <div className={styles.macroTrack}>
        <div className={styles.macroFill} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

interface SlotTarget { day: DayOfWeek; mealType: MealType }

export default function PlannerPage() {
  const [weekLabel, setWeekLabel] = useState(getCurrentWeekLabel);
  const [plan, setPlan] = useState<WeekPlan>(emptyWeekPlan);
  const [mealLibrary, setMealLibrary] = useState<Meal[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("Mon");
  const [picker, setPicker] = useState<SlotTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => { mealsApi.getAll().then(setMealLibrary).catch(() => {}); }, []);

  const loadWeek = useCallback(async (label: string) => {
    setLoading(true);
    try {
      const entries = await planApi.getWeek(label);
      setPlan(entriesToWeekPlan(entries) as WeekPlan);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadWeek(weekLabel); }, [weekLabel, loadWeek]);

  const setMeal = (day: DayOfWeek, mealType: MealType, meal: Meal) => {
    setPlan((prev) => ({ ...prev, [day]: { ...prev[day], [mealType]: meal } }));
    planApi.setSlot(day, mealType, meal.id, weekLabel).catch(() => {});
  };

  const removeMeal = (day: DayOfWeek, mealType: MealType) => {
    setPlan((prev) => ({ ...prev, [day]: { ...prev[day], [mealType]: null } }));
    planApi.clearSlot(day, mealType, weekLabel).catch(() => {});
  };

  const handlePickerSelect = (meal: Meal) => {
    if (!picker) return;
    setMeal(picker.day, picker.mealType, meal);
    setPicker(null);
  };

  const handleMealCreate = useCallback(async (data: Omit<Meal, "id">) => {
    const newMeal = await mealsApi.create(data);
    setMealLibrary((prev) => [...prev, newMeal]);
  }, []);

  const handleMealUpdate = useCallback(async (id: number, data: Omit<Meal, "id">) => {
    const updated = await mealsApi.update(id, data);
    setMealLibrary((prev) => prev.map((m) => (m.id === id ? updated : m)));
    setPlan((prev) => {
      const next = { ...prev };
      for (const d of DAYS) {
        for (const mt of MEAL_TYPES) {
          if (next[d][mt]?.id === id) next[d] = { ...next[d], [mt]: updated };
        }
      }
      return next;
    });
  }, []);

  const handleMealDelete = useCallback(async (id: number) => {
    await mealsApi.delete(id);
    setMealLibrary((prev) => prev.filter((m) => m.id !== id));
    setPlan((prev) => {
      const next = { ...prev };
      for (const d of DAYS) {
        for (const mt of MEAL_TYPES) {
          if (next[d][mt]?.id === id) next[d] = { ...next[d], [mt]: null };
        }
      }
      return next;
    });
  }, []);

  // ── AI generation ─────────────────────────────────────────────────────────────
  const generateWeek = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY as string | undefined;
    if (!apiKey) {
      setGenError("Add VITE_ANTHROPIC_API_KEY to frontend/.env to enable AI generation.");
      return;
    }
    setGenerating(true);
    setGenError(null);
    const prompt = `You are a nutrition-aware meal planner. Assign meals from the provided library to fill an entire week (7 days x 4 meal types), aiming to hit these daily goals: ${GOALS.cal} kcal, ${GOALS.protein}g protein, ${GOALS.carbs}g carbs, ${GOALS.fat}g fat.

Meal library (use ONLY these IDs):
${mealLibrary.map((m) => `ID ${m.id}: ${m.name} — ${m.calories}kcal, ${m.protein}g protein, ${m.carbs}g carbs, ${m.fat}g fat`).join("\n")}

Rules: vary meals, prefer IDs ${MEAL_LIBRARY_IDS.Breakfast.join(",")} for Breakfast and IDs ${MEAL_LIBRARY_IDS.Snack.join(",")} for Snack. Stay within 150 kcal of goal.
Respond ONLY with valid JSON: {"Mon":{"Breakfast":7,"Lunch":3,"Dinner":5,"Snack":13},...,"Sun":{...}}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json() as any;
      const text = (data.content as { text?: string }[]).map((b) => b.text ?? "").join("").trim();
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as Record<string, Record<string, number>>;
      const newPlan = emptyWeekPlan();
      const bulk: { dayOfWeek: DayOfWeek; mealType: MealType; mealId: number }[] = [];
      for (const day of DAYS) {
        for (const mt of MEAL_TYPES) {
          const meal = mealLibrary.find((m) => m.id === parsed[day]?.[mt]);
          if (meal) { newPlan[day][mt] = meal; bulk.push({ dayOfWeek: day, mealType: mt, mealId: meal.id }); }
        }
      }
      setPlan(newPlan);
      await planApi.bulkSet(weekLabel, bulk);
    } catch { setGenError("Generation failed — please try again."); }
    finally { setGenerating(false); }
  };

  // ── Derived nutrition ──────────────────────────────────────────────────────────
  const dayMeals = MEAL_TYPES.map((mt) => plan[selectedDay][mt]).filter(Boolean) as Meal[];
  const dayNutrition = dayMeals.reduce(
    (acc, m) => ({ cal: acc.cal + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const weeklyMeals = DAYS.flatMap((d) => MEAL_TYPES.map((mt) => plan[d][mt]).filter(Boolean)) as Meal[];
  const weeklyNutrition = weeklyMeals.reduce(
    (acc, m) => ({ cal: acc.cal + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.weekDateLabel}>{weekRangeLabel(weekLabel)}</div>
          <h1 className={styles.title}>Meal <em className={styles.titleItalic}>Planner</em></h1>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.weekNav}>
            <button className={styles.navBtn} onClick={() => setWeekLabel((w) => shiftWeek(w, -1))}>‹</button>
            <span className={styles.weekLabelBadge}>{weekLabel}</span>
            <button className={styles.navBtn} onClick={() => setWeekLabel((w) => shiftWeek(w, 1))}>›</button>
            {weekLabel !== getCurrentWeekLabel() && (
              <button className={styles.todayBtn} onClick={() => setWeekLabel(getCurrentWeekLabel())}>Today</button>
            )}
          </div>
          {weeklyNutrition.cal > 0 && (
            <div className={styles.weeklyAvg}>
              <div className={styles.weeklyAvgLabel}>Weekly avg</div>
              <div className={styles.weeklyAvgValue}>{Math.round(weeklyNutrition.cal / 7)}<span className={styles.weeklyAvgUnit}>kcal/day</span></div>
            </div>
          )}
          <button className={styles.generateBtn} onClick={generateWeek} disabled={generating || mealLibrary.length === 0}>
            {generating ? <><Spinner />&nbsp;Generating…</> : <><span>✦</span>&nbsp;Generate week</>}
          </button>
        </div>
      </div>

      {genError && <div className={styles.genError}>{genError}</div>}

      {/* Body */}
      <div className={styles.body}>

        {/* ── Left: calendar ── */}
        <div className={styles.calendar}>

          {/* Day tabs */}
          <div className={styles.dayTabs}>
            {DAYS.map((day) => {
              const filled = MEAL_TYPES.filter((mt) => plan[day][mt] !== null).length;
              const isActive = day === selectedDay;
              return (
                <button key={day} className={`${styles.dayTab} ${isActive ? styles.dayTabActive : ""}`} onClick={() => setSelectedDay(day)}>
                  {day}
                  {filled > 0 && <span className={`${styles.dayDot} ${isActive ? styles.dayDotActive : ""}`} />}
                </button>
              );
            })}
          </div>

          {/* 2×2 Meal cards */}
          <div className={styles.mealGrid}>
            {MEAL_TYPES.map((mealType) => {
              const meal = plan[selectedDay][mealType];
              return (
                <div key={mealType} className={`${styles.mealCard} ${meal && !loading ? styles.mealCardFilled : ""}`}>
                  <div className={styles.mealCardType}>{mealType}</div>
                  {loading ? (
                    <div className={styles.mealSkeleton} />
                  ) : meal ? (
                    <>
                      <div className={styles.mealEmoji}>{meal.emoji}</div>
                      <div className={styles.mealName}>{meal.name}</div>
                      <div className={styles.mealMeta}>{meal.calories} kcal · {meal.protein}g pro</div>
                      <button className={styles.removeMealBtn} onClick={() => removeMeal(selectedDay, mealType)} title="Remove">×</button>
                    </>
                  ) : (
                    <button className={styles.addMealBtn} onClick={() => setPicker({ day: selectedDay, mealType })}>+</button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Week at a glance */}
          <div className={styles.glanceCard}>
            <div className={styles.sectionLabel}>Week at a glance</div>
            <div className={styles.glanceRow}>
              {DAYS.map((day) => {
                const dayCal = MEAL_TYPES.reduce((sum, mt) => sum + (plan[day][mt]?.calories ?? 0), 0);
                const isActive = day === selectedDay;
                return (
                  <div key={day} className={`${styles.glanceDay} ${isActive ? styles.glanceDayActive : ""}`} onClick={() => setSelectedDay(day)}>
                    <div className={`${styles.glanceDayLabel} ${isActive ? styles.glanceDayLabelActive : ""}`}>{day}</div>
                    <div className={styles.glanceBars}>
                      {MEAL_TYPES.map((mt) => (
                        <div key={mt} className={`${styles.glanceBar} ${plan[day][mt] ? styles.glanceBarFilled : ""}`} />
                      ))}
                    </div>
                    {dayCal > 0 && <div className={styles.glanceCal}>{dayCal}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right: sidebar ── */}
        <div className={styles.sidebar}>

          {/* Daily nutrition */}
          <div className={styles.nutritionCard}>
            <div className={styles.sectionLabel}>{selectedDay} · Nutrition</div>
            <div className={styles.calorieBlock}>
              <div className={styles.calorieNumber}>{dayNutrition.cal}</div>
              <div className={styles.calorieGoal}>of {GOALS.cal} kcal</div>
              <div className={styles.calorieBg}>
                <div className={styles.calorieFill} style={{
                  width: `${Math.min((dayNutrition.cal / GOALS.cal) * 100, 100)}%`,
                  background: dayNutrition.cal > GOALS.cal ? "#e8a090" : "#7cc49a",
                }} />
              </div>
            </div>
            <MacroBar label="Protein" value={dayNutrition.protein} max={GOALS.protein} color="#7cc49a" />
            <MacroBar label="Carbs"   value={dayNutrition.carbs}   max={GOALS.carbs}   color="#7ab0d4" />
            <MacroBar label="Fat"     value={dayNutrition.fat}      max={GOALS.fat}     color="#e8c97a" />
          </div>

          {/* Weekly totals */}
          <div className={styles.weeklyCard}>
            <div className={styles.sectionLabelDark}>Weekly totals</div>
            {([
              { label: "Calories", value: weeklyNutrition.cal,     unit: "kcal" },
              { label: "Protein",  value: weeklyNutrition.protein,  unit: "g"    },
              { label: "Carbs",    value: weeklyNutrition.carbs,    unit: "g"    },
              { label: "Fat",      value: weeklyNutrition.fat,      unit: "g"    },
            ] as const).map(({ label, value, unit }) => (
              <div key={label} className={styles.weeklyRow}>
                <span className={styles.weeklyRowLabel}>{label}</span>
                <span className={styles.weeklyRowValue}>{value}<span className={styles.weeklyRowUnit}>{unit}</span></span>
              </div>
            ))}
            <div className={styles.weeklyDivider} />
            <div className={styles.weeklyRow}>
              <span className={styles.weeklyRowLabel}>Meals logged</span>
              <span className={styles.weeklyRowValue}>{weeklyMeals.length}<span className={styles.weeklyRowUnit}>/28</span></span>
            </div>
          </div>

          {/* Today's meals list */}
          {dayMeals.length > 0 && (
            <div className={styles.todayCard}>
              <div className={styles.sectionLabel}>Today's meals</div>
              {MEAL_TYPES.map((mt) => {
                const m = plan[selectedDay][mt];
                if (!m) return null;
                return (
                  <div key={mt} className={styles.todayMeal}>
                    <span className={styles.todayMealEmoji}>{m.emoji}</span>
                    <div>
                      <div className={styles.todayMealName}>{m.name}</div>
                      <div className={styles.todayMealMeta}>{mt} · {m.calories} kcal</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {picker && (
        <MealPickerModal
          day={picker.day}
          mealType={picker.mealType}
          meals={mealLibrary}
          onSelect={handlePickerSelect}
          onClose={() => setPicker(null)}
          onMealCreate={handleMealCreate}
          onMealUpdate={handleMealUpdate}
          onMealDelete={handleMealDelete}
        />
      )}
    </div>
  );
}