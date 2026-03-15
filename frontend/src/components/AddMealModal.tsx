import { useState, useEffect } from "react";
import type { Meal } from "../types";
import { mealsApi } from "../services/api";

type MealFormData = Omit<Meal, "id">;

const emptyForm = (): MealFormData => ({ name: "", emoji: "", calories: 0, protein: 0, carbs: 0, fat: 0 });

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const s = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)", zIndex: 200,
    display: "flex", alignItems: "center", justifyContent: "center",
  } as React.CSSProperties,
  modal: {
    background: "#fff", borderRadius: 20, width: 420,
    display: "flex", flexDirection: "column", overflow: "hidden",
    boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
  } as React.CSSProperties,
  headerWrap: { padding: "24px 24px 0" } as React.CSSProperties,
  headingRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 } as React.CSSProperties,
  heading: { fontSize: 18, fontFamily: "'Fraunces', serif", color: "#1a1a1a", fontWeight: 300, margin: 0 } as React.CSSProperties,
  closeBtn: {
    background: "none", border: "none", cursor: "pointer", fontSize: 18,
    color: "#aaa", lineHeight: 1, padding: "2px 6px", borderRadius: 6,
  } as React.CSSProperties,
  form: { padding: "20px 24px 24px" } as React.CSSProperties,
  formRow: { display: "flex", gap: 8, marginBottom: 10 } as React.CSSProperties,
  formInput: {
    flex: 1, border: "1px solid #e8e8e8", borderRadius: 8, padding: "8px 10px",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none",
    background: "#fafafa", color: "#1a1a1a",
  } as React.CSSProperties,
  formError: { color: "#e55", fontSize: 12, marginBottom: 8 } as React.CSSProperties,
  formActions: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 } as React.CSSProperties,
  cancelBtn: {
    background: "none", border: "1px solid #e8e8e8", borderRadius: 8, padding: "8px 16px",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", color: "#555",
  } as React.CSSProperties,
  saveBtn: {
    background: "#1a1a1a", border: "none", borderRadius: 8, padding: "8px 16px",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", color: "#fff", fontWeight: 500,
  } as React.CSSProperties,
  divider: { height: 1, background: "#f0f0f0", margin: "0 0 0 0" } as React.CSSProperties,
};

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

export default function AddMealModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<MealFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = (field: keyof MealFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.emoji.trim()) {
      setError("Name and emoji are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await mealsApi.create(form);
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save meal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.headerWrap}>
          <div style={s.headingRow}>
            <div style={s.heading}>New Meal</div>
            <button style={s.closeBtn} onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>
        <div style={s.divider} />
        <div style={s.form}>
          <div style={s.formRow}>
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              style={{ ...s.formInput, flex: 2 }}
              autoFocus
            />
            <input
              placeholder="🍕"
              value={form.emoji}
              onChange={(e) => handleChange("emoji", e.target.value)}
              style={{ ...s.formInput, flex: "none" as React.CSSProperties["flex"], width: 64 }}
            />
          </div>
          <div style={s.formRow}>
            <NumInput label="Calories" value={form.calories} onChange={(v) => handleChange("calories", v)} />
            <NumInput label="Protein g" value={form.protein} onChange={(v) => handleChange("protein", v)} />
          </div>
          <div style={s.formRow}>
            <NumInput label="Carbs g" value={form.carbs} onChange={(v) => handleChange("carbs", v)} />
            <NumInput label="Fat g" value={form.fat} onChange={(v) => handleChange("fat", v)} />
          </div>
          {error && <div style={s.formError}>{error}</div>}
          <div style={s.formActions}>
            <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save meal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
