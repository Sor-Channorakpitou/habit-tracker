import { useState, useEffect } from "react";
import type { Habit } from "../lib/supabase";

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (habitData: { name: string; color: string; frequency: string }) => Promise<void>;
  initialHabit?: Habit | null;
  loading: boolean;
}

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#eab308", // Amber
  "#f97316", // Orange
  "#ec4899", // Pink
  "#a855f7", // Purple
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Every Day" },
  { value: "weekdays", label: "Weekdays (Mon-Fri)" },
  { value: "weekends", label: "Weekends (Sat-Sun)" },
  { value: "3x-week", label: "3 Times a Week" },
];

export default function HabitModal({
  isOpen,
  onClose,
  onSubmit,
  initialHabit,
  loading,
}: HabitModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [frequency, setFrequency] = useState("daily");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialHabit) {
      setName(initialHabit.name);
      setColor(initialHabit.color || "#6366f1");
      setFrequency(initialHabit.frequency || "daily");
    } else {
      setName("");
      setColor("#6366f1");
      setFrequency("daily");
    }
    setError(null);
  }, [initialHabit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a habit name.");
      return;
    }

    try {
      setError(null);
      await onSubmit({
        name: name.trim(),
        color,
        frequency,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save habit");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-dot" style={{ backgroundColor: color }} />
            <h2 className="modal-title">
              {initialHabit ? "Edit Habit" : "Create New Habit"}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="feedback-banner error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="habit-name">Habit Name</label>
            <input
              id="habit-name"
              type="text"
              placeholder="e.g. Read 20 pages, Hydrate, Workout..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label>Color Accent</label>
            <div className="color-swatches">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${color === c ? "selected" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="habit-frequency">Frequency Goal</label>
            <select
              id="habit-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-spinner-content">
                  <span className="spinner-small" /> Saving...
                </span>
              ) : initialHabit ? (
                "Save Changes"
              ) : (
                "Create Habit"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
