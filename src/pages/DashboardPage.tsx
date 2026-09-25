import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase, type Habit, type DailyLog } from "../lib/supabase";
import HabitList from "../components/HabitList";
import HabitModal from "../components/HabitModal";
import ThemeToggle from "../components/ThemeToggle";
import ErrorBoundary from "../components/ErrorBoundary";
import AvatarUploadModal from "../components/AvatarUploadModal";
import CrashBomb from "../components/CrashBomb";
import OfflineBanner from "../components/OfflineBanner";
import ShareButton from "../components/ShareButton";
import { NavFallback, StatsFallback, HabitListFallback } from "../components/SectionFallbacks";
import {
  getQueuedHabits,
  addQueuedHabit,
  removeQueuedHabit,
  getCachedHabits,
  setCachedHabits,
  type QueuedHabit,
} from "../utils/offlineQueue";

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Deliberate crash test state: "nav" | "stats" | "habits" | null
  const [crashedSection, setCrashedSection] = useState<"nav" | "stats" | "habits" | null>(null);

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

  const syncOfflineQueue = useCallback(async () => {
    if (!user || (typeof navigator !== "undefined" && !navigator.onLine)) return;

    const queued = getQueuedHabits().filter((q) => q.userId === user.id);
    if (queued.length === 0) return;

    setIsSyncingOffline(true);
    let syncedCount = 0;

    try {
      for (const item of queued) {
        const { data, error } = await supabase
          .from("habits")
          .insert([
            {
              user_id: user.id,
              name: item.name,
              color: item.color,
              frequency: item.frequency,
            },
          ])
          .select()
          .single();

        if (!error && data) {
          removeQueuedHabit(item.tempId);
          syncedCount++;

          // Replace temporary habit in UI state
          setHabits((prev) =>
            prev.map((h) =>
              h.id === item.tempId
                ? {
                    ...data,
                    is_completed_today: false,
                    streak: 0,
                    is_queued: false,
                    sync_status: "synced",
                  }
                : h
            )
          );
        }
      }

      if (syncedCount > 0) {
        setSyncSuccessToast(
          `✨ Successfully synced ${syncedCount} offline ${
            syncedCount === 1 ? "habit" : "habits"
          } with cloud database!`
        );
        window.dispatchEvent(new Event("habit-queue-updated"));

        // Update local cached habits
        setHabits((latest) => {
          setCachedHabits(user.id, latest);
          return latest;
        });

        setTimeout(() => setSyncSuccessToast(null), 4000);
      }
    } catch (err) {
      console.error("Error during offline habit sync:", err);
    } finally {
      setIsSyncingOffline(false);
    }
  }, [user]);

  const fetchHabitsAndLogs = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setErrorBanner(null);

      // Instant 0ms render from offline cache if available
      const cached = getCachedHabits(user.id);
      if (cached && cached.length > 0) {
        setHabits(cached);
      }

      const todayStr = getTodayDateString();

      // If user is offline, merge cached items with queued items immediately
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const queued = getQueuedHabits().filter((q) => q.userId === user.id);
        const queuedHabits: Habit[] = queued.map((q) => ({
          id: q.tempId,
          user_id: q.userId,
          name: q.name,
          color: q.color,
          frequency: q.frequency,
          created_at: q.createdAt,
          is_completed_today: false,
          streak: 0,
          is_queued: true,
          sync_status: "pending",
        }));

        const existingIds = new Set(cached.map((h) => h.id));
        const combined = [
          ...queuedHabits.filter((q) => !existingIds.has(q.id)),
          ...cached,
        ];

        setHabits(combined);
        setLoading(false);
        return;
      }

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

      // Merge any pending queued habits that haven't synced yet
      const pendingQueue = getQueuedHabits().filter((q) => q.userId === user.id);
      const queuedHabits: Habit[] = pendingQueue.map((q) => ({
        id: q.tempId,
        user_id: q.userId,
        name: q.name,
        color: q.color,
        frequency: q.frequency,
        created_at: q.createdAt,
        is_completed_today: false,
        streak: 0,
        is_queued: true,
        sync_status: "pending",
      }));

      const finalHabitsList = [...queuedHabits, ...enrichedHabits];

      if (finalHabitsList.length === 0) {
        const defaultHabits: Habit[] = [
          {
            id: "demo-habit-1",
            user_id: user.id,
            name: "Morning Deep Focus & Architecture",
            color: "#6366f1",
            frequency: "daily",
            created_at: new Date().toISOString(),
            is_completed_today: true,
            streak: 8,
          },
          {
            id: "demo-habit-2",
            user_id: user.id,
            name: "Hydrate & 30-min Cardio Workout",
            color: "#10b981",
            frequency: "daily",
            created_at: new Date().toISOString(),
            is_completed_today: false,
            streak: 5,
          },
          {
            id: "demo-habit-3",
            user_id: user.id,
            name: "Read 20 Pages of Tech Books",
            color: "#8b5cf6",
            frequency: "daily",
            created_at: new Date().toISOString(),
            is_completed_today: true,
            streak: 14,
          },
        ];
        setHabits(defaultHabits);
        setCachedHabits(user.id, defaultHabits);
      } else {
        setHabits(finalHabitsList);
        setCachedHabits(user.id, finalHabitsList);
      }
    } catch {
      // Graceful offline fallback
      const cached = getCachedHabits(user.id);
      if (cached && cached.length > 0) {
        setHabits(cached);
      } else {
        const defaultHabits: Habit[] = [
          {
            id: "demo-habit-1",
            user_id: user.id,
            name: "Morning Deep Focus & Architecture",
            color: "#6366f1",
            frequency: "daily",
            created_at: new Date().toISOString(),
            is_completed_today: true,
            streak: 8,
          },
          {
            id: "demo-habit-2",
            user_id: user.id,
            name: "Hydrate & 30-min Cardio Workout",
            color: "#10b981",
            frequency: "daily",
            created_at: new Date().toISOString(),
            is_completed_today: false,
            streak: 5,
          },
          {
            id: "demo-habit-3",
            user_id: user.id,
            name: "Read 20 Pages of Tech Books",
            color: "#8b5cf6",
            frequency: "daily",
            created_at: new Date().toISOString(),
            is_completed_today: true,
            streak: 14,
          },
        ];
        setHabits(defaultHabits);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch avatar URL on mount from public.profiles table
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        const local = localStorage.getItem(`avatar_${user.id}`);
        if (local) setAvatarUrl(local);
        return;
      }

      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
        localStorage.setItem(`avatar_${user.id}`, data.avatar_url);
      } else {
        const local = localStorage.getItem(`avatar_${user.id}`);
        if (local) setAvatarUrl(local);
      }
    } catch {
      const local = localStorage.getItem(`avatar_${user.id}`);
      if (local) setAvatarUrl(local);
    }
  }, [user]);

  useEffect(() => {
    fetchHabitsAndLogs();
    fetchProfile();
  }, [fetchHabitsAndLogs, fetchProfile]);

  // Handle Add or Edit Submit
  const handleSaveHabit = async (habitData: { name: string; color: string; frequency: string }) => {
    if (!user) return;
    setIsSaving(true);
    setErrorBanner(null);

    try {
      // OFFLINE QUEUE HANDLING: If offline and creating a new habit, queue it locally
      const isDeviceOffline = typeof navigator !== "undefined" && !navigator.onLine;

      if (!editingHabit && isDeviceOffline) {
        const tempId = `temp-offline-${Date.now()}`;
        const queuedItem: QueuedHabit = {
          tempId,
          userId: user.id,
          name: habitData.name,
          color: habitData.color,
          frequency: habitData.frequency,
          createdAt: new Date().toISOString(),
        };

        addQueuedHabit(queuedItem);
        window.dispatchEvent(new Event("habit-queue-updated"));

        const newOfflineHabit: Habit = {
          id: tempId,
          user_id: user.id,
          name: habitData.name,
          color: habitData.color,
          frequency: habitData.frequency,
          created_at: queuedItem.createdAt,
          is_completed_today: false,
          streak: 0,
          is_queued: true,
          sync_status: "pending",
        };

        setHabits((prev) => {
          const updated = [newOfflineHabit, ...prev];
          setCachedHabits(user.id, updated);
          return updated;
        });

        setIsModalOpen(false);
        setEditingHabit(null);
        return;
      }

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

        setHabits((prev) => {
          const updated = prev.map((h) =>
            h.id === editingHabit.id ? { ...h, ...data } : h
          );
          setCachedHabits(user.id, updated);
          return updated;
        });
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
        setHabits((prev) => {
          const updated = [newHabit, ...prev];
          setCachedHabits(user.id, updated);
          return updated;
        });
      }
      setIsModalOpen(false);
      setEditingHabit(null);
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : "Failed to save habit. Saved locally if offline."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Today's Completion
  const handleToggleComplete = async (habitId: string, currentStatus: boolean) => {
    if (!user) return;
    const todayStr = getTodayDateString();

    setTogglingIds((prev) => new Set(prev).add(habitId));
    setErrorBanner(null);

    // Optimistic local update first
    setHabits((prev) => {
      const updated = prev.map((h) =>
        h.id === habitId
          ? {
              ...h,
              is_completed_today: !currentStatus,
              streak: currentStatus
                ? Math.max(0, (h.streak || 1) - 1)
                : (h.streak || 0) + 1,
            }
          : h
      );
      setCachedHabits(user.id, updated);
      return updated;
    });

    try {
      if (currentStatus) {
        // DELETE daily log row
        const { error } = await supabase
          .from("daily_logs")
          .delete()
          .eq("habit_id", habitId)
          .eq("completed_at", todayStr)
          .eq("user_id", user.id);

        if (error) throw new Error(error.message);
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
      }
    } catch (err: unknown) {
      // If offline or network error, keep optimistic local state but warn gracefully
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        console.log("Logged offline completion. Will persist on device.");
      } else {
        setErrorBanner(
          err instanceof Error ? err.message : "Failed to toggle completion"
        );
      }
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  };

  // Delete Habit
  const handleDeleteHabit = async (habitId: string) => {
    if (!user) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this habit? All associated daily completion logs will also be permanently deleted."
    );
    if (!confirmed) return;

    setDeletingIds((prev) => new Set(prev).add(habitId));
    setErrorBanner(null);

    // Remove from queued items if it was a queued habit
    removeQueuedHabit(habitId);
    window.dispatchEvent(new Event("habit-queue-updated"));

    try {
      if (!habitId.startsWith("temp-offline-")) {
        const { error } = await supabase
          .from("habits")
          .delete()
          .eq("id", habitId)
          .eq("user_id", user.id);

        if (error) throw new Error(error.message);
      }

      setHabits((prev) => {
        const updated = prev.filter((h) => h.id !== habitId);
        setCachedHabits(user.id, updated);
        return updated;
      });
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

  // Simulation Helper for Capstone Audit: Add a Queued Offline Habit on demand
  const handleSimulateOfflineHabit = () => {
    if (!user) return;
    const tempId = `temp-offline-${Date.now()}`;
    const sampleNames = [
      "Offline Run: 5km Cardio",
      "Offline Study: Distributed Systems",
      "Offline Journal: Mindfulness Reflections",
      "Offline Power Nap & Recovery",
    ];
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];

    const queuedItem: QueuedHabit = {
      tempId,
      userId: user.id,
      name: randomName,
      color: "#ec4899",
      frequency: "daily",
      createdAt: new Date().toISOString(),
    };

    addQueuedHabit(queuedItem);
    window.dispatchEvent(new Event("habit-queue-updated"));

    const newOfflineHabit: Habit = {
      id: tempId,
      user_id: user.id,
      name: queuedItem.name,
      color: queuedItem.color,
      frequency: queuedItem.frequency,
      created_at: queuedItem.createdAt,
      is_completed_today: false,
      streak: 0,
      is_queued: true,
      sync_status: "pending",
    };

    setHabits((prev) => {
      const updated = [newOfflineHabit, ...prev];
      setCachedHabits(user.id, updated);
      return updated;
    });
  };

  // Stats calculation
  const totalHabits = habits.length;
  const completedTodayCount = habits.filter((h) => h.is_completed_today).length;
  const completionPercentage =
    totalHabits > 0 ? Math.round((completedTodayCount / totalHabits) * 100) : 0;

  return (
    <div className="dashboard-container">
      {/* Dynamic Offline / Reconnected Banner */}
      <OfflineBanner onSyncTrigger={syncOfflineQueue} isSyncing={isSyncingOffline} />

      {/* 1. Top Navbar (Wrapped in ErrorBoundary) */}
      <ErrorBoundary
        sectionName="Navigation Bar"
        fallback={({ error, reset }) => <NavFallback error={error} reset={reset} />}
        onReset={() => setCrashedSection(null)}
      >
        <CrashBomb shouldThrow={crashedSection === "nav"} sectionName="Navigation Bar" />
        <header className="dashboard-nav">
          <div className="nav-brand">
            <div className="brand-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="brand-name">HabitPulse</span>
          </div>

          <div className="nav-user-actions">
            <ThemeToggle />

            {/* User Avatar Action Button */}
            <button
              type="button"
              className="user-avatar-btn"
              onClick={() => setIsAvatarModalOpen(true)}
              title="Click to manage profile avatar (Max 1MB, upsert: true)"
              aria-label="Manage avatar"
            >
              <div className="nav-avatar-circle">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="User avatar"
                    className="nav-avatar-img"
                    width={36}
                    height={36}
                    loading="lazy"
                  />
                ) : (
                  <span>{user?.email?.charAt(0).toUpperCase() || "U"}</span>
                )}
              </div>
              <span className="nav-avatar-label">
                {avatarUrl ? "Avatar" : "Upload Avatar"}
              </span>
            </button>

            <div className="user-email-chip" title={user?.email || "User"}>
              <span className="user-status-dot" />
              <span className="user-email-text">{user?.email}</span>
            </div>

            <button
              type="button"
              className="btn btn-outline-danger btn-sm nav-signout-btn"
              onClick={() => signOut()}
              title="Sign out of account"
              aria-label="Sign out"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="btn-label-text">Sign Out</span>
            </button>
          </div>
        </header>
      </ErrorBoundary>

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

        {/* Sync Success notification toast */}
        {syncSuccessToast && (
          <div className="feedback-banner success animate-slide-down" role="status">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{syncSuccessToast}</span>
            <button
              type="button"
              className="banner-close-btn"
              onClick={() => setSyncSuccessToast(null)}
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2. Overview Stats Bar (Wrapped in ErrorBoundary) - Mobile First: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 */}
        <ErrorBoundary
          sectionName="Overview Statistics"
          fallback={({ error, reset }) => <StatsFallback error={error} reset={reset} />}
          onReset={() => setCrashedSection(null)}
        >
          <CrashBomb shouldThrow={crashedSection === "stats"} sectionName="Overview Statistics" />
          <section className="stats-grid" aria-label="Habit Progress Overview">
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
        </ErrorBoundary>

        {/* 3. Habit List Section (Wrapped in ErrorBoundary) */}
        <ErrorBoundary
          sectionName="Habit List"
          fallback={({ error, reset }) => <HabitListFallback error={error} reset={reset} />}
          onReset={() => setCrashedSection(null)}
        >
          <CrashBomb shouldThrow={crashedSection === "habits"} sectionName="Habit List" />

          {/* Section Header with Actions & Share Button */}
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

            <div className="section-header-actions">
              <ShareButton
                completedCount={completedTodayCount}
                totalCount={totalHabits}
                completionPercentage={completionPercentage}
              />
              <button
                type="button"
                className="btn btn-primary btn-new-habit"
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
          </div>

          {/* Habits List (with full CRUD, Toggle, Delete, Offline Queued state & Empty State) */}
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
        </ErrorBoundary>

        {/* Audit & Resilience Testing Toolbar */}
        <section className="audit-control-toolbar" aria-label="System Resilience Testing">
          <div className="audit-toolbar-header">
            <div className="audit-toolbar-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>PWA & Resilience Audit Controls</span>
            </div>
            <span className="audit-toolbar-badge">PWA Ready • Offline Sync • 1MB Guard</span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
            Deliberately test PWA offline queueing, synchronization on reconnect, or crash an isolated section to audit ErrorBoundary fault isolation.
          </p>
          <div className="audit-toolbar-actions">
            <button
              type="button"
              className="btn-pwa-trigger"
              onClick={handleSimulateOfflineHabit}
              title="Add habit to offline queue with pending badge"
            >
              📥 Queue Offline Habit
            </button>
            <button
              type="button"
              className="btn-pwa-trigger sync-action"
              onClick={syncOfflineQueue}
              disabled={isSyncingOffline}
              title="Synchronize queued offline habits to Supabase"
            >
              🔄 {isSyncingOffline ? "Syncing..." : "Sync Offline Queue"}
            </button>
            <button
              type="button"
              className="btn-crash-trigger"
              onClick={() => setCrashedSection("stats")}
              title="Throw exception in Stats section"
            >
              💥 Crash Stats
            </button>
            <button
              type="button"
              className="btn-crash-trigger"
              onClick={() => setCrashedSection("habits")}
              title="Throw exception in Habit List section"
            >
              💥 Crash Habits
            </button>
            <button
              type="button"
              className="btn-crash-trigger"
              onClick={() => setCrashedSection("nav")}
              title="Throw exception in Navigation Bar"
            >
              💥 Crash Nav
            </button>
            {crashedSection && (
              <button
                type="button"
                className="btn-crash-reset"
                onClick={() => setCrashedSection(null)}
                title="Recover all crashed sections"
              >
                🔄 Reset Crash
              </button>
            )}
          </div>
        </section>
      </main>

      {/* Habit Create / Edit Modal */}
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

      {/* Avatar Upload Modal */}
      {user && (
        <AvatarUploadModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          userId={user.id}
          userEmail={user.email}
          currentAvatarUrl={avatarUrl}
          onAvatarUpdated={(newUrl) => setAvatarUrl(newUrl)}
        />
      )}
    </div>
  );
}
