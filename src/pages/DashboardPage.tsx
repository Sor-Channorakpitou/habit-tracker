import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase, type Habit, type DailyLog } from "../lib/supabase";
import HabitList from "../components/HabitList";
import HabitModal from "../components/HabitModal";
import ThemeToggle from "../components/ThemeToggle";

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Per-habit action spinners
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // ISO date string for today (YYYY-MM-DD)
  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const fetchHabitsAndLogs = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setErrorBanner(null);

      const todayStr = getTodayDateString();

      // 1. Fetch user's habits (scoped to user.id via .eq)
      const { data: habitsData, error: habitsError } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (habitsError) {
        throw new Error(`Failed to load habits: ${habitsError.message}`);
      }

      // 2. Fetch user's daily logs for streak & today's completion
      const { data: logsData, error: logsError } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id);

      if (logsError) {
        console.warn("Could not load daily logs:", logsError.message);
      }

      const allLogs = (logsData as DailyLog[]) || [];
      const todayLogsSet = new Set(
        allLogs.filter((log) => log.completed_at === todayStr).map((log) => log.habit_id)
      );

      // Compute streak per habit
      const enrichedHabits: Habit[] = ((habitsData as Habit[]) || []).map((h) => {
        const habitLogs = allLogs
          .filter((l) => l.habit_id === h.id)
          .map((l) => l.completed_at)
          .sort()
          .reverse();

        // Calculate consecutive day streak
        let streak = 0;
        const checkDate = new Date();
        // If completed today, start counting from today; otherwise check yesterday
        const todayLogged = todayLogsSet.has(h.id);
        if (!todayLogged) {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
          const formatted = checkDate.toISOString().split("T")[0];
          if (habitLogs.includes(formatted)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }

        return {
          ...h,
          is_completed_today: todayLogged,
          streak: streak > 0 ? streak : todayLogged ? 1 : 0,
        };
      });

      setHabits(enrichedHabits);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to fetch habits");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHabitsAndLogs();
  }, [fetchHabitsAndLogs]);

  // Handle Add or Edit Submit
  const handleSaveHabit = async (habitData: { name: string; color: string; frequency: string }) => {
    if (!user) return;
    setIsSaving(true);
    setErrorBanner(null);

    try {
      if (editingHabit) {
        // UPDATE habit (.eq("id", editingHabit.id) & .eq("user_id", user.id))
        const { data, error } = await supabase
          .from("habits")
          .update({
            name: habitData.name,
            color: habitData.color,
            frequency: habitData.frequency,
          })
          .eq("id", editingHabit.id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw new Error(error.message);

        setHabits((prev) =>
          prev.map((h) => (h.id === editingHabit.id ? { ...h, ...data } : h))
        );
      } else {
        // INSERT habit
        const { data, error } = await supabase
          .from("habits")
          .insert([
            {
              user_id: user.id,
              name: habitData.name,
              color: habitData.color,
              frequency: habitData.frequency,
            },
          ])
          .select()
          .single();

        if (error) throw new Error(error.message);

        const newHabit: Habit = {
          ...data,
          is_completed_today: false,
          streak: 0,
        };
        setHabits((prev) => [newHabit, ...prev]);
      }
    } catch (err: unknown) {
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Today's Completion (daily_logs insert / delete)
  const handleToggleComplete = async (habitId: string, currentStatus: boolean) => {
    if (!user) return;
    const todayStr = getTodayDateString();

    setTogglingIds((prev) => new Set(prev).add(habitId));
    setErrorBanner(null);

    try {
      if (currentStatus) {
        // DELETE daily log row (.eq habit_id, .eq completed_at, .eq user_id)
        const { error } = await supabase
          .from("daily_logs")
          .delete()
          .eq("habit_id", habitId)
          .eq("completed_at", todayStr)
          .eq("user_id", user.id);

        if (error) throw new Error(error.message);

        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId
              ? {
                  ...h,
                  is_completed_today: false,
                  streak: Math.max(0, (h.streak || 1) - 1),
                }
              : h
          )
        );
      } else {
        // INSERT daily log row
        const { error } = await supabase.from("daily_logs").insert([
          {
            habit_id: habitId,
            user_id: user.id,
            completed_at: todayStr,
          },
        ]);

        if (error) throw new Error(error.message);

        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId
              ? {
                  ...h,
                  is_completed_today: true,
                  streak: (h.streak || 0) + 1,
                }
              : h
          )
        );
      }
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to toggle completion");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  };

  // Delete Habit (.eq("id", habitId) & .eq("user_id", user.id))
  // Foreign key ON DELETE CASCADE removes daily_logs automatically!
  const handleDeleteHabit = async (habitId: string) => {
    if (!user) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this habit? All associated daily completion logs will also be permanently deleted."
    );
    if (!confirmed) return;

    setDeletingIds((prev) => new Set(prev).add(habitId));
    setErrorBanner(null);

    try {
      const { error } = await supabase
        .from("habits")
        .delete()
        .eq("id", habitId)
        .eq("user_id", user.id);

      if (error) throw new Error(error.message);

      setHabits((prev) => prev.filter((h) => h.id !== habitId));
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to delete habit");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  };

  // Stats calculation
  const totalHabits = habits.length;
  const completedTodayCount = habits.filter((h) => h.is_completed_today).length;
  const completionPercentage =
    totalHabits > 0 ? Math.round((completedTodayCount / totalHabits) * 100) : 0;

  return (
    <div className="dashboard-container">
      {/* Top Navbar */}
      <header className="dashboard-nav">
        <div className="nav-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="brand-name">HabitPulse</span>
        </div>

        <div className="nav-user-actions">
          <ThemeToggle />

          <div className="user-email-chip" title={user?.email || "User"}>
            <span className="user-status-dot" />
            <span className="user-email-text">{user?.email}</span>
          </div>

          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => signOut()}
            title="Sign out of account"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Error notification banner */}
        {errorBanner && (
          <div className="feedback-banner error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorBanner}</span>
            <button
              type="button"
              className="banner-close-btn"
              onClick={() => setErrorBanner(null)}
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        )}

        {/* Overview Stats Bar */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">Total Habits</span>
              <span className="stat-value">{totalHabits}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">Completed Today</span>
              <span className="stat-value">
                {completedTodayCount} / {totalHabits}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">Today&apos;s Progress</span>
              <span className="stat-value">{completionPercentage}%</span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </section>

        {/* Section Header with Actions */}
        <div className="section-header">
          <div>
            <h2 className="section-title">Today&apos;s Habits</h2>
            <p className="section-subtitle">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingHabit(null);
              setIsModalOpen(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Habit</span>
          </button>
        </div>

        {/* Habits List (with full CRUD, Toggle, Delete & Empty State) */}
        <HabitList
          habits={habits}
          loading={loading}
          onToggleComplete={handleToggleComplete}
          onEditHabit={(habit) => {
            setEditingHabit(habit);
            setIsModalOpen(true);
          }}
          onDeleteHabit={handleDeleteHabit}
          onAddNew={() => {
            setEditingHabit(null);
            setIsModalOpen(true);
          }}
          togglingIds={togglingIds}
          deletingIds={deletingIds}
        />
      </main>

      {/* Create / Edit Modal */}
      <HabitModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingHabit(null);
        }}
        onSubmit={handleSaveHabit}
        initialHabit={editingHabit}
        loading={isSaving}
      />
    </div>
  );
}
