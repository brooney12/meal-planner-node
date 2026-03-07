import { useState, useEffect, useRef } from "react";
import type { Meal, MealType, DayOfWeek } from "../types";

interface Props {
  day: DayOfWeek;
  mealType: MealType;
  meals: Meal[];
  onSelect: (meal: Meal) => void;
  onClose: () => void;
}

const s = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)", zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center",
  } as React.CSSProperties,
  modal: {
    background: "#fff", borderRadius: 20, width: 380, maxHeight: "80vh",
    display: "flex", flexDirection: "column", overflow: "hidden",
    boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
  } as React.CSSProperties,
  headerWrap: { padding: "24px 24px 16px" } as React.CSSProperties,
  meta: { fontSize: 11, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 } as React.CSSProperties,
  heading: { fontSize: 18, fontFamily: "'Fraunces', serif", color: "#1a1a1a", marginBottom: 16, fontWeight: 300 } as React.CSSProperties,
  search: {
    width: "100%", border: "none", background: "#f5f5f5", borderRadius: 10,
    padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    outline: "none", boxSizing: "border-box", color: "#333",
  } as React.CSSProperties,
  list: { overflowY: "auto", padding: "0 12px 12px" } as React.CSSProperties,
  emoji: { fontSize: 22 } as React.CSSProperties,
  name: { fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: "#1a1a1a", fontWeight: 500 } as React.CSSProperties,
  macros: { fontSize: 11, color: "#aaa", marginTop: 2 } as React.CSSProperties,
};

const itemStyle = (hovered: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
  borderRadius: 12, cursor: "pointer", background: hovered ? "#f7f7f7" : "transparent",
  transition: "background 0.15s",
});

export default function MealPickerModal({ day, mealType, meals, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = meals.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.headerWrap}>
          <div style={s.meta}>{day} · {mealType}</div>
          <div style={s.heading}>Choose a meal</div>
          <input
            ref={inputRef}
            placeholder="Search meals..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={s.search}
          />
        </div>
        <div style={s.list}>
          {filtered.map((meal) => (
            <div
              key={meal.id}
              style={itemStyle(hovered === meal.id)}
              onMouseEnter={() => setHovered(meal.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => { onSelect(meal); onClose(); }}
            >
              <span style={s.emoji}>{meal.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={s.name}>{meal.name}</div>
                <div style={s.macros}>
                  {meal.calories} kcal · {meal.protein}g protein · {meal.carbs}g carbs · {meal.fat}g fat
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "#bbb", fontSize: 13, padding: "1rem" }}>
              No meals match "{query}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
