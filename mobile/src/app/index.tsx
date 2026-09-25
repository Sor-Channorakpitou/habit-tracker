import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useHabits } from '@/hooks/useHabits';
import { shareProgress } from '@/utils/share';
import { Habit } from '@/types/habit';

export default function HabitListScreen() {
  const router = useRouter();
  const { habits, toggleHabit, deleteHabit } = useHabits();

  const completedCount = habits.filter((h) => h.is_completed_today).length;
  const totalCount = habits.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Single call-site for our Platform.select branch
  const handleShareStreak = async () => {
    const message = `🔥 HabitPulse Streak: Completed ${completedCount}/${totalCount} (${percentage}%) of my habits today! Building consistency daily.`;
    const result = await shareProgress({
      title: 'HabitPulse Streak',
      message,
      url: 'https://habitpulse.io',
    });

    if (result.action === 'copied') {
      Alert.alert('Copied!', 'Streak details copied to clipboard.');
    }
  };

  const confirmDelete = (habit: Habit) => {
    Alert.alert('Delete Habit', `Are you sure you want to delete "${habit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) },
    ]);
  };

  const renderHabitItem = ({ item }: { item: Habit }) => {
    const isDone = item.is_completed_today;

    return (
      <View
        className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3 mx-4"
        style={{
          borderLeftWidth: 4,
          borderLeftColor: item.color || '#6366f1',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Toggle Checkbox Button */}
        <Pressable
          onPress={() => toggleHabit(item.id)}
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            isDone ? 'bg-indigo-600' : 'border-2 border-slate-700 bg-slate-800/60'
          }`}
          accessibilityLabel={isDone ? `Mark ${item.name} incomplete` : `Mark ${item.name} complete`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDone }}
        >
          {isDone ? (
            <Text className="text-white font-bold text-base">✓</Text>
          ) : (
            <View className="w-3 h-3 rounded-full bg-slate-700" />
          )}
        </Pressable>

        {/* Habit Content */}
        <View className="flex-1 mr-2">
          <Text
            className={`text-base font-semibold ${
              isDone ? 'text-slate-400 line-through' : 'text-slate-100'
            }`}
          >
            {item.name}
          </Text>

          <View className="flex-row items-center mt-1.5 space-x-2">
            <View
              className="px-2 py-0.5 rounded-md"
              style={{ backgroundColor: `${item.color}25` }}
            >
              <Text className="text-xs font-medium" style={{ color: item.color }}>
                {item.category}
              </Text>
            </View>

            <Text className="text-xs text-slate-500 capitalize ml-2">
              {item.frequency}
            </Text>
          </View>
        </View>

        {/* Streak Counter & Delete */}
        <View className="items-end justify-between space-y-2">
          <View className="flex-row items-center bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
            <Text className="text-xs text-amber-400 font-bold mr-1">🔥</Text>
            <Text className="text-xs font-semibold text-slate-200">{item.streak}d</Text>
          </View>

          <Pressable
            onPress={() => confirmDelete(item)}
            className="p-1 opacity-60 active:opacity-100 mt-1"
            hitSlop={8}
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Text className="text-xs text-rose-400">✕</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View className="px-5 pt-4 pb-4">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between mb-5">
        <View>
          <Text className="text-2xl font-extrabold text-white tracking-tight">
            Habit<Text className="text-indigo-500">Pulse</Text>
          </Text>
          <Text className="text-xs text-slate-400 mt-0.5">Mobile Habit Tracker</Text>
        </View>

        <Pressable
          onPress={() => router.push('/add')}
          className="bg-indigo-600 active:bg-indigo-700 px-4 py-2.5 rounded-xl flex-row items-center shadow-lg shadow-indigo-600/30"
          accessibilityLabel="Add new habit"
        >
          <Text className="text-white font-bold text-sm mr-1">+</Text>
          <Text className="text-white font-semibold text-sm">Add Habit</Text>
        </Pressable>
      </View>

      {/* Progress & Streak Card */}
      <View className="bg-gradient-to-r bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-3 shadow-md">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Today&apos;s Progress
            </Text>
            <Text className="text-2xl font-bold text-white mt-1">
              {completedCount} of {totalCount} completed
            </Text>
          </View>
          <View className="w-14 h-14 rounded-full bg-indigo-600/20 border-2 border-indigo-500 items-center justify-center">
            <Text className="text-indigo-400 font-extrabold text-sm">{percentage}%</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-4">
          <View
            className="h-full bg-indigo-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </View>

        {/* Share Streak Action (Platform Branch Test) */}
        <Pressable
          onPress={handleShareStreak}
          className="bg-slate-800 active:bg-slate-700/80 border border-slate-700 rounded-xl py-2.5 px-4 flex-row items-center justify-center"
          accessibilityLabel="Share habit streak"
        >
          <Text className="text-sm font-semibold text-slate-200">
            📤 Share Today&apos;s Streak
          </Text>
        </Pressable>
      </View>

      {/* Section Header */}
      <View className="flex-row items-center justify-between mt-4 mb-2">
        <Text className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Your Daily Habits
        </Text>
        <Text className="text-xs text-slate-500">{totalCount} total</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View className="items-center justify-center py-16 px-6">
      <View className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-4">
        <Text className="text-2xl">🌱</Text>
      </View>
      <Text className="text-lg font-bold text-slate-200 mb-1">No habits yet</Text>
      <Text className="text-sm text-slate-400 text-center mb-6 max-w-xs">
        Tap the button below to add your first habit and start building lasting consistency.
      </Text>
      <Pressable
        onPress={() => router.push('/add')}
        className="bg-indigo-600 active:bg-indigo-700 px-5 py-3 rounded-xl"
      >
        <Text className="text-white font-semibold text-sm">+ Create Your First Habit</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabitItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}
