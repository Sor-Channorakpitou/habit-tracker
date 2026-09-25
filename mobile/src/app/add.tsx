import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useHabits } from '@/hooks/useHabits';

const CATEGORIES = [
  { name: 'Health', color: '#06b6d4' },
  { name: 'Productivity', color: '#6366f1' },
  { name: 'Fitness', color: '#10b981' },
  { name: 'Mindset', color: '#f59e0b' },
  { name: 'Learning', color: '#ec4899' },
];

const FREQUENCIES = ['daily', 'weekdays', 'weekly'];

export default function AddHabitScreen() {
  const router = useRouter();
  const { addHabit } = useHabits();

  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [frequency, setFrequency] = useState('daily');
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a habit title.');
      return;
    }

    addHabit({
      name: trimmed,
      category: selectedCategory.name,
      color: selectedCategory.color,
      frequency,
    });

    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-extrabold text-white">Create New Habit</Text>
            <Text className="text-sm text-slate-400 mt-1">
              Commit to small, consistent actions that compound over time.
            </Text>
          </View>

          {/* Habit Name Input */}
          <View className="mb-6">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Habit Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError('');
              }}
              placeholder="e.g. Read 20 pages, 15 min meditation"
              placeholderTextColor="#64748b"
              className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3.5 text-white text-base"
              autoFocus
            />
            {error ? (
              <Text className="text-xs text-rose-400 mt-1.5">{error}</Text>
            ) : null}
          </View>

          {/* Category Selection */}
          <View className="mb-6">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Category
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory.name === cat.name;
                return (
                  <Pressable
                    key={cat.name}
                    onPress={() => setSelectedCategory(cat)}
                    className={`px-4 py-2.5 rounded-xl border ${
                      isSelected
                        ? 'border-indigo-500 bg-slate-900'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="w-2.5 h-2.5 rounded-full mr-2"
                        style={{ backgroundColor: cat.color }}
                      />
                      <Text
                        className={`text-sm font-medium ${
                          isSelected ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Frequency Selection */}
          <View className="mb-8">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Frequency
            </Text>
            <View className="flex-row bg-slate-900 border border-slate-800 rounded-2xl p-1">
              {FREQUENCIES.map((freq) => {
                const isSelected = frequency === freq;
                return (
                  <Pressable
                    key={freq}
                    onPress={() => setFrequency(freq)}
                    className={`flex-1 py-2.5 items-center rounded-xl ${
                      isSelected ? 'bg-indigo-600 shadow' : 'bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold capitalize ${
                        isSelected ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {freq}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Actions */}
          <View className="space-y-3">
            <Pressable
              onPress={handleSave}
              className="bg-indigo-600 active:bg-indigo-700 py-4 rounded-2xl items-center shadow-lg shadow-indigo-600/30"
            >
              <Text className="text-white font-bold text-base">Save Habit</Text>
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              className="py-3 items-center"
            >
              <Text className="text-slate-400 font-semibold text-sm">Cancel</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
