import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  Alert,
  StyleSheet,
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
        className="habit-card"
        style={[
          styles.habitCard,
          { borderLeftColor: item.color || '#6366f1' },
        ]}
      >
        {/* Toggle Checkbox Button */}
        <Pressable
          onPress={() => toggleHabit(item.id)}
          style={[
            styles.checkbox,
            isDone ? styles.checkboxCompleted : styles.checkboxPending,
          ]}
          accessibilityLabel={isDone ? `Mark ${item.name} incomplete` : `Mark ${item.name} complete`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDone }}
        >
          {isDone ? (
            <Text style={styles.checkIcon}>✓</Text>
          ) : (
            <View style={styles.checkInnerDot} />
          )}
        </Pressable>

        {/* Habit Content */}
        <View style={styles.habitContent}>
          <Text
            style={[
              styles.habitTitle,
              isDone && styles.habitTitleDone,
            ]}
          >
            {item.name}
          </Text>

          <View style={styles.habitMetaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: `${item.color}25` }]}>
              <Text style={[styles.categoryBadgeText, { color: item.color }]}>
                {item.category}
              </Text>
            </View>

            <Text style={styles.frequencyText}>
              {item.frequency}
            </Text>
          </View>
        </View>

        {/* Streak Counter & Delete */}
        <View style={styles.habitActions}>
          <View style={styles.streakBadge}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text style={styles.streakCount}>{item.streak}d</Text>
          </View>

          <Pressable
            onPress={() => confirmDelete(item)}
            style={styles.deleteButton}
            hitSlop={8}
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Text style={styles.deleteText}>✕</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.logoText}>
            Habit<Text style={styles.logoAccent}>Pulse</Text>
          </Text>
          <Text style={styles.subtitleText}>Mobile Habit Tracker</Text>
        </View>

        <Pressable
          onPress={() => router.push('/add')}
          style={styles.addButton}
          accessibilityLabel="Add new habit"
        >
          <Text style={styles.addButtonText}>+ Add Habit</Text>
        </Pressable>
      </View>

      {/* Progress & Streak Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <View>
            <Text style={styles.progressEyebrow}>TODAY&apos;S PROGRESS</Text>
            <Text style={styles.progressStat}>
              {completedCount} of {totalCount} completed
            </Text>
          </View>
          <View style={styles.percentageCircle}>
            <Text style={styles.percentageText}>{percentage}%</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percentage}%` },
            ]}
          />
        </View>

        {/* Share Streak Action (Platform Branch Test) */}
        <Pressable
          onPress={handleShareStreak}
          style={styles.shareButton}
          accessibilityLabel="Share habit streak"
        >
          <Text style={styles.shareButtonText}>
            📤 Share Today&apos;s Streak
          </Text>
        </Pressable>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>YOUR DAILY HABITS</Text>
        <Text style={styles.sectionCount}>{totalCount} total</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={{ fontSize: 28 }}>🌱</Text>
      </View>
      <Text style={styles.emptyTitle}>No habits yet</Text>
      <Text style={styles.emptyDesc}>
        Tap the button below to add your first habit and build lasting consistency.
      </Text>
      <Pressable
        onPress={() => router.push('/add')}
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>+ Create Your First Habit</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabitItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  listContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: '#6366f1',
  },
  subtitleText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  progressCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#94a3b8',
  },
  progressStat: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  percentageCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 2,
    borderColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    color: '#818cf8',
    fontWeight: '800',
    fontSize: 15,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#1e293b',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 5,
  },
  shareButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#94a3b8',
  },
  sectionCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderLeftWidth: 5,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  checkbox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxPending: {
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  checkboxCompleted: {
    backgroundColor: '#4f46e5',
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  checkInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#475569',
  },
  habitContent: {
    flex: 1,
    marginRight: 8,
  },
  habitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  habitTitleDone: {
    color: '#64748b',
    textDecorationLine: 'line-through',
  },
  habitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  frequencyText: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  habitActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 48,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#334155',
  },
  streakFlame: {
    fontSize: 12,
    marginRight: 4,
  },
  streakCount: {
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 2,
  },
  deleteText: {
    color: '#f43f5e',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 260,
  },
});
