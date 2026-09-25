import type { Habit } from "../lib/supabase";

interface HabitListProps {
  habits: Habit[];
  loading: boolean;
  onToggleComplete: (habitId: string, currentStatus: boolean) => Promise<void>;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => Promise<void>;
  onAddNew: () => void;
  togglingIds: Set<string>;
  deletingIds: Set<string>;
}

export default function HabitList({
  habits,
  loading,
  onToggleComplete,
  onEditHabit,
  onDeleteHabit,
  onAddNew,
  togglingIds,
  deletingIds,
}: HabitListProps) {
  if (loading) {
    return (
      <div className="habit-list-skeleton">
        {[1, 2, 3].map((n) => (
          <div key={n} className="skeleton-card">
            <div className="skeleton-dot" />
            <div className="skeleton-lines">
              <div className="skeleton-line-long" />
              <div className="skeleton-line-short" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // SECOND ACCOUNT AUDIT REQUIREMENT:
  // "a second test account sees an EMPTY habit list (not an error)"
  if (habits.length === 0) {
    return (
      <div className="empty-state-card">
        <div className="empty-icon-circle">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <h3 className="empty-title">No habits found</h3>
        <p className="empty-description">
          You don&apos;t have any tracked habits yet. Create your first habit below to start your streak!
        </p>
        <button type="button" className="btn btn-primary" onClick={onAddNew}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Create Your First Habit</span>
        </button>
      </div>
    );
  }

  return (
    <div className="habit-list">
      {habits.map((habit) => {
        const isToggling = togglingIds.has(habit.id);
        const isDeleting = deletingIds.has(habit.id);
        const isDone = Boolean(habit.is_completed_today);

        return (
          <div
            key={habit.id}
            className={`habit-item-card ${isDone ? "completed" : ""}`}
            style={{ "--habit-accent": habit.color } as React.CSSProperties}
          >
            {/* Completion Toggle Button */}
            <button
              type="button"
              className={`habit-check-btn ${isDone ? "checked" : ""}`}
              onClick={() => onToggleComplete(habit.id, isDone)}
              disabled={isToggling || isDeleting}
              aria-label={isDone ? `Mark ${habit.name} incomplete` : `Mark ${habit.name} complete`}
              title={isDone ? "Completed today! Click to undo" : "Mark as completed today"}
            >
              {isToggling ? (
                <span className="spinner-tiny" />
              ) : isDone ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="checkbox-empty-circle" style={{ borderColor: habit.color }} />
              )}
            </button>

            {/* Habit Details */}
            <div className="habit-content">
              <div className="habit-header-row">
                <span
                  className="habit-color-indicator"
                  style={{ backgroundColor: habit.color }}
                />
                <h4 className={`habit-name ${isDone ? "line-through" : ""}`}>
                  {habit.name}
                </h4>
                {isDone && <span className="completed-badge">Done Today</span>}
              </div>
              <div className="habit-meta-row">
                <span className="habit-pill frequency-pill">
                  {habit.frequency}
                </span>
                {habit.is_queued ? (
                  <span className="habit-pill queued-pill" title="Saved locally on this device. Syncs automatically upon reconnection.">
                    ⏳ Queued for sync
                  </span>
                ) : habit.streak && habit.streak > 0 ? (
                  <span className="habit-pill streak-pill">
                    🔥 {habit.streak} {habit.streak === 1 ? "day" : "days"} streak
                  </span>
                ) : (
                  <span className="habit-pill status-pill">
                    {isDone ? "1 day logged" : "Not logged today"}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons: Edit & Delete */}
            <div className="habit-actions">
              <button
                type="button"
                className="icon-btn edit-btn"
                onClick={() => onEditHabit(habit)}
                disabled={isDeleting}
                aria-label={`Edit ${habit.name}`}
                title="Edit habit"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>

              <button
                type="button"
                className="icon-btn delete-btn"
                onClick={() => onDeleteHabit(habit.id)}
                disabled={isDeleting}
                aria-label={`Delete ${habit.name}`}
                title="Delete habit"
              >
                {isDeleting ? (
                  <span className="spinner-tiny" />
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
