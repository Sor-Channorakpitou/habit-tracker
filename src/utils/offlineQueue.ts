import type { Habit } from "../lib/supabase";

export interface QueuedHabit {
  tempId: string;
  userId: string;
  name: string;
  color: string;
  frequency: string;
  createdAt: string;
}

export interface QueuedLog {
  id: string;
  habitId: string;
  userId: string;
  action: "insert" | "delete";
  completedAt: string;
  timestamp: number;
}

const QUEUE_KEY = "habitpulse_offline_habits_queue";
const CACHE_KEY_PREFIX = "habitpulse_cached_habits_";

export function getQueuedHabits(): QueuedHabit[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read queued habits from localStorage", err);
    return [];
  }
}

export function saveQueuedHabits(items: QueuedHabit[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save queued habits to localStorage", err);
  }
}

export function addQueuedHabit(item: QueuedHabit): void {
  const current = getQueuedHabits();
  current.push(item);
  saveQueuedHabits(current);
}

export function removeQueuedHabit(tempId: string): void {
  const current = getQueuedHabits();
  const filtered = current.filter((h) => h.tempId !== tempId);
  saveQueuedHabits(filtered);
}

export function clearQueuedHabits(): void {
  localStorage.removeItem(QUEUE_KEY);
}

// Cached habits for offline initial view
export function getCachedHabits(userId: string): Habit[] {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read cached habits", err);
    return [];
  }
}

export function setCachedHabits(userId: string, habits: Habit[]): void {
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${userId}`, JSON.stringify(habits));
  } catch (err) {
    console.error("Failed to write cached habits", err);
  }
}
