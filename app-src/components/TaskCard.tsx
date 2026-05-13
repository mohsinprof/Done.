import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Task } from '../../app-src/types';
import { Colors } from '../../app-example/constants/theme';
import { useColorScheme } from '../../app-example/hooks/use-color-scheme';
import { ProgressBar } from './ProgressBar';
import { useTask } from '../../app-src/context/TaskContext';
import { isTaskBehindSchedule, formatHours } from '../../app-src/utils/helpers';

interface TaskCardProps {
  task: Task;
}

/**
 * Task card component - displays task info and progress
 */
export function TaskCard({ task }: TaskCardProps) {
  const systemColorScheme = useColorScheme();
  const router = useRouter();
  const { state, startTimer, deleteItem, restartTask } = useTask();
  
  const colors = Colors[state.themeMode === 'system' ? (systemColorScheme ?? 'light') : state.themeMode];

  const isBehind = isTaskBehindSchedule(task);
  const remaining = task.remainingHours + (task.dailyTargetHours - task.completedTodayHours);
  const isCompleted = task.completedTodayHours >= task.dailyTargetHours;
  const isLifetimeDone = !!task.isLifetimeCompleted;

  const handleStartTimer = () => {
    if (isCompleted || isLifetimeDone) {
      Alert.alert('Task Completed', 'You have already reached your target!');
      return;
    }
    startTimer(task.id);
  };

  const handleViewDetails = () => {
    router.push({
      pathname: '/task-detail',
      params: { taskId: task.id },
    });
  };

  return (
    <TouchableOpacity
      onPress={handleViewDetails}
      style={[
        styles.container,
        {
          borderColor: isLifetimeDone ? '#4CAF50' : (isCompleted ? '#4CAF50' : isBehind ? '#ff6b6b' : colors.tabIconDefault),
          backgroundColor: isLifetimeDone ? 'rgba(76, 175, 80, 0.2)' : (isCompleted ? 'rgba(76, 175, 80, 0.1)' : colors.background),
          borderWidth: (isCompleted || isLifetimeDone) ? 2 : 1,
        },
      ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{task.name}</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {isLifetimeDone && (
            <Text style={[styles.behindBadge, { backgroundColor: '#4CAF50' }]}>Goal Reached!</Text>
          )}
          {isCompleted && !isLifetimeDone && (
            <Text style={[styles.behindBadge, { backgroundColor: '#4CAF50' }]}>Completed</Text>
          )}
          {isBehind && !isCompleted && !isLifetimeDone && (
            <Text style={styles.behindBadge}>Behind</Text>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
            Remaining
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatHours(remaining)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
            Today
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatHours(task.completedTodayHours)} / {formatHours(task.dailyTargetHours)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
            Total
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatHours(task.totalCompletedHours)}
            {task.targetTotalHours ? ` / ${formatHours(task.targetTotalHours)}` : ''}
          </Text>
        </View>
      </View>

      <ProgressBar
        completed={task.completedTodayHours}
        target={task.dailyTargetHours}
        showLabel={false}
      />

      {(task.totalChapters || 0) > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
            Chapters: {task.completedChaptersCount || 0} / {task.totalChapters}
          </Text>
        </View>
      )}

      {isLifetimeDone ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            onPress={() => restartTask(task.id)}
            style={[styles.startButton, { backgroundColor: colors.tint, flex: 1 }]}>
            <Text style={styles.startButtonText}>Restart Goal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteItem(task.id)}
            style={[styles.startButton, { backgroundColor: '#ff6b6b', flex: 1 }]}>
            <Text style={styles.startButtonText}>Delete Task</Text>
          </TouchableOpacity>
        </View>
      ) : !isCompleted && (
        <TouchableOpacity
          onPress={handleStartTimer}
          style={[styles.startButton, { backgroundColor: colors.tint }]}>
          <Text style={styles.startButtonText}>Start Timer</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  behindBadge: {
    backgroundColor: '#ff6b6b',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  startButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
