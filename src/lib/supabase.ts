import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  color: string;
  frequency: string;
  created_at: string;
  // Computed / client-side properties
  is_completed_today?: boolean;
  streak?: number;
}

export interface DailyLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  created_at: string;
}
