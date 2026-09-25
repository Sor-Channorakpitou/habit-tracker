export interface Habit {
  id: string;
  name: string;
  category: string;
  color: string;
  frequency: string;
  streak: number;
  is_completed_today: boolean;
  created_at: string;
}

export const INITIAL_HABITS: Habit[] = [
  {
    id: 'habit-1',
    name: 'Morning Hydration (1L water)',
    category: 'Health',
    color: '#06b6d4',
    frequency: 'daily',
    streak: 12,
    is_completed_today: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'habit-2',
    name: 'Deep Focus Coding (45m)',
    category: 'Productivity',
    color: '#6366f1',
    frequency: 'daily',
    streak: 8,
    is_completed_today: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'habit-3',
    name: 'Cardio & Stretching',
    category: 'Fitness',
    color: '#10b981',
    frequency: 'daily',
    streak: 5,
    is_completed_today: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'habit-4',
    name: 'Evening Reading (20 pages)',
    category: 'Mindset',
    color: '#f59e0b',
    frequency: 'daily',
    streak: 14,
    is_completed_today: true,
    created_at: new Date().toISOString(),
  },
];
