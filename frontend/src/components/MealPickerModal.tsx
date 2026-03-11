import { useState, useEffect, useRef } from "react";
import type { Meal, MealType, DayOfWeek } from "../types";

type MealFormData = Omit<Meal, "id">;

interface Props {
  day: DayOfWeek;
  mealType: MealType;
  meals: Meal[];
  onSelect: (meal: Meal) => void;
  onClose: () => void;
  onMealCreate: (data: MealFormData) => Promise<void>;
  onMealUpdate: (id: number, data: MealFormData) => Promise<void>;
  onMealDelete: (id: number) => Promise<void>;
}

const emptyForm = (): MealFormData => ({ name: "", emoji: "", calories: 0, protein: 0, carbs: 0, fat: 0 });

const s = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)", zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center",
  } as React.CSSProperties,
  modal: {
    background: "#fff", borderRadius: 20, width: 420, maxHeight: "85vh",
    display: "flex", flexDirection: "column", overflow: "hidden",
    boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
  } as React.CSSProperties,
  headerWrap: { padding: "24px 24px 16px" } as React.CSSProperties,
  meta: { fontSize: 11, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 } as React.CSSProperties,
  headingRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } as React.CSSProperties,
  heading: { fontSize: 18, fontFamily: "'Fraunces', serif", color: "#1a1a1a", fontWeight: 300, margin: 0 } as React.CSSProperties,
  search: {
    width: "100%", border: "none", background: "#f5f5f5", borderRadius: 10,
    padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    outline: "none", boxSizing: "border-box", color: "#333",
  } as React.CSSProperties,
  list: { overflowY: "auto", padding: "0 12px 12px" } as React.CSSProperties,
  emoji: { fontSize: 22 } as React.CSSProperties,
  name: { fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: "#1a1a1a", fontWeight: 500 } as React.CSSProperties,
  macros: { fontSize: 11, color: "#aaa", marginTop: 2 } as React.CSSProperties,
  newBtn: {
    background: "#f5f5f5", border: "none", borderRadius: 8, padding: "6px 12px",
    fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", color: "#555", fontWeight: 500,
  } as React.CSSProperties,
  iconBtn: {
    background: "none", border: "none", cursor: "pointer", fontSize: 14,
    padding: "2px 4px", borderRadius: 6, opacity: 0.55, lineHeight: 1,
  } as React.CSSProperties,
  form: { padding: "0 24px 20px", borderTop: "1px solid #f0f0f0" } as React.CSSProperties,
  formTitle: {
    fontSize: 14, fontWeight: 600, color: "#1a1a1a",
    fontFamily: "'DM Sans', sans-serif", margin: "16px 0 12px",
  } as React.CSSProperties,
  formRow: { display: "flex", gap: 8, marginBottom: 8 } as React.CSSProperties,
  formInput: {
    flex: 1, border: "1px solid #e8e8e8", borderRadius: 8, padding: "8px 10px",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none",
    background: "#fafafa", color: "#1a1a1a",
  } as React.CSSProperties,
  formError: { color: "#e55", fontSize: 12, marginBottom: 8 } as React.CSSProperties,
  formActions: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 } as React.CSSProperties,
  cancelBtn: {
    background: "none", border: "1px solid #e8e8e8", borderRadius: 8, padding: "8px 16px",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", color: "#555",
  } as React.CSSProperties,
  saveBtn: {
    background: "#1a1a1a", border: "none", borderRadius: 8, padding: "8px 16px",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", color: "#fff", fontWeight: 500,
  } as React.CSSProperties,
};

const itemStyle = (hovered: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
  borderRadius: 12, background: hovered ? "#f7f7f7" : "transparent",
  transition: "background 0.15s",
});

interface NumInputProps { label: string; value: number; onChange: (v: number) => void; }
function NumInput({ label, value, onChange }: NumInputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
      <label style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        style={s.formInput}
      />
    </div>
  );
}

export default function MealPickerModal({ day, mealType, meals, onSelect, onClose, onMealCreate, onMealUpdate, onMealDelete }: Props) {
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<"none" | "create" | "edit">("none");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MealFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formMode === "none") inputRef.current?.focus();
  }, [formMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (formMode !== "none") setFormMode("none");
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, formMode]);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormMode("create");
    setFormError(null);
  };

  const openEdit = (meal: Meal) => {
    const { id: _id, ...rest } = meal;
    setForm(rest);
    setEditingId(meal.id);
    setFormMode("edit");
    setFormError(null);
  };

  const handleFormChange = (field: keyof MealFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.emoji.trim()) {
      setFormError("Name and emoji are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (formMode === "create") {
        await onMealCreate(form);
      } else if (formMode === "edit" && editingId !== null) {
        await onMealUpdate(editingId, form);
      }
      setFormMode("none");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save meal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (meal: Meal) => {
    await onMealDelete(meal.id);
  };

  const filtered = meals.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.headerWrap}>
          <div style={s.meta}>{day} · {mealType}</div>
          <div style={s.headingRow}>
            <div style={s.heading}>Choose a meal</div>
            <button onClick={openCreate} style={s.newBtn}>+ New</button>
          </div>
          {formMode === "none" && (
            <input
              ref={inputRef}
              placeholder="Search meals..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={s.search}
            />
          )}
        </div>

        {formMode !== "none" && (
          <div style={s.form}>
            <div style={s.formTitle}>{formMode === "create" ? "New Meal" : "Edit Meal"}</div>
            <div style={s.formRow}>
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                style={{ ...s.formInput, flex: 2 }}
              />
              <input
                placeholder="Emoji"
                value={form.emoji}
                onChange={(e) => handleFormChange("emoji", e.target.value)}
                style={{ ...s.formInput, flex: "none" as React.CSSProperties["flex"], width: 64 }}
              />
            </div>
            <div style={s.formRow}>
              <NumInput label="Cal" value={form.calories} onChange={(v) => handleFormChange("calories", v)} />
              <NumInput label="Protein" value={form.protein} onChange={(v) => handleFormChange("protein", v)} />
              <NumInput label="Carbs" value={form.carbs} onChange={(v) => handleFormChange("carbs", v)} />
              <NumInput label="Fat" value={form.fat} onChange={(v) => handleFormChange("fat", v)} />
            </div>
            {formError && <div style={s.formError}>{formError}</div>}
            <div style={s.formActions}>
              <button onClick={() => setFormMode("none")} style={s.cancelBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {formMode === "none" && (
          <div style={s.list}>
            {filtered.map((meal) => (
              <div
                key={meal.id}
                style={itemStyle(hovered === meal.id)}
                onMouseEnter={() => setHovered(meal.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer" }}
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
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    aria-label={`Edit ${meal.name}`}
                    onClick={(e) => { e.stopPropagation(); openEdit(meal); }}
                    style={s.iconBtn}
                  >✏️</button>
                  <button
                    aria-label={`Delete ${meal.name}`}
                    onClick={(e) => { e.stopPropagation(); handleDelete(meal); }}
                    style={s.iconBtn}
                  >🗑️</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p style={{ textAlign: "center", color: "#bbb", fontSize: 13, padding: "1rem" }}>
                No meals match "{query}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

