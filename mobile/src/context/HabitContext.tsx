import React, { createContext, useState, type ReactNode } from 'react';
import { Habit, INITIAL_HABITS } from '../types/habit';

export interface HabitContextType {
  habits: Habit[];
  toggleHabit: (id: string) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'created_at' | 'streak' | 'is_completed_today'>) => void;
  deleteHabit: (id: string) => void;
}

export const HabitContext = createContext<HabitContextType | null>(null);

export const HabitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);

  const toggleHabit = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const nextCompleted = !h.is_completed_today;
          return {
            ...h,
            is_completed_today: nextCompleted,
            streak: nextCompleted ? h.streak + 1 : Math.max(0, h.streak - 1),
          };
        }
        return h;
      })
    );
  };

  const addHabit = (data: Omit<Habit, 'id' | 'created_at' | 'streak' | 'is_completed_today'>) => {
    const newHabit: Habit = {
      ...data,
      id: `habit-${Date.now()}`,
      streak: 0,
      is_completed_today: false,
      created_at: new Date().toISOString(),
    };
    setHabits((prev) => [newHabit, ...prev]);
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <HabitContext.Provider value={{ habits, toggleHabit, addHabit, deleteHabit }}>
      {children}
    </HabitContext.Provider>
  );
};
