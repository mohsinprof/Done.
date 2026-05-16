import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Task } from '../../app-src/types';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
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
  const { 
    state, 
    startTimer, 
    stopTimer, 
    deleteItem, 
    restartTask, 
    getTaskTodaySeconds, 
    getTaskTotalSeconds 
  } = useTask();
  
  // Local state for live timer updates
  const [liveTrigger, setLiveTrigger] = React.useState(0);
  const isActive = state.activeTimerTaskId === task.id;

  React.useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setLiveTrigger(prev => prev + 1);
      }, 1000);
    } else {
      setLiveTrigger(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const colors = Colors[state.themeMode === 'system' ? (systemColorScheme ?? 'light') : state.themeMode];

  const isBehind = isTaskBehindSchedule(task);
  
  // Use centralized math from context
  const currentCompletedTodaySeconds = getTaskTodaySeconds(task);
  const currentCompletedTodayHours = currentCompletedTodaySeconds / 3600;
  
  const dailyTargetSeconds = Math.round((task.dailyTargetHours + task.remainingHours) * 3600);
  const remainingTodaySeconds = Math.max(0, dailyTargetSeconds - currentCompletedTodaySeconds);
  
  // Overall remaining
  const totalTargetHours = task.targetTotalHours || task.dailyTargetHours;
  const totalTargetSeconds = Math.round(totalTargetHours * 3600);
  const totalCompletedSoFarSeconds = getTaskTotalSeconds(task);
  const remainingOverallSeconds = Math.max(0, totalTargetSeconds - totalCompletedSoFarSeconds);
  
  const isCompleted = currentCompletedTodaySeconds >= dailyTargetSeconds;
  const isLifetimeDone = !!task.isLifetimeCompleted;

  const remainingDays = task.completionPriority === 'days'
    ? Math.max(0, (task.totalDaysGoal || 0) - (task.daysWorkedCount || 0) - (isCompleted ? 1 : 0))
    : 0;

  // Auto-stop if goal reached
  React.useEffect(() => {
    if (isActive && (isCompleted || isLifetimeDone)) {
      // Small delay to allow state to settle and UI to show 100%
      const timeout = setTimeout(() => {
        stopTimer();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isActive, isCompleted, isLifetimeDone, stopTimer]);

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
          borderColor: isLifetimeDone ? '#4CAF50' : (isCompleted ? '#a5d6a7' : isBehind ? '#ff6b6b' : colors.tabIconDefault),
          backgroundColor: isLifetimeDone ? 'rgba(76, 175, 80, 0.2)' : (isCompleted ? 'rgba(76, 175, 80, 0.1)' : colors.background),
          borderWidth: isLifetimeDone ? 2 : (isCompleted ? 1.5 : 1),
        },
      ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{task.name}</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {isLifetimeDone && (
            <Text style={[styles.behindBadge, { backgroundColor: '#4CAF50' }]}>Goal Reached!</Text>
          )}
          {isCompleted && !isLifetimeDone && (
            <Text style={[styles.behindBadge, { backgroundColor: '#4CAF50', opacity: 0.8 }]}>Daily Goal Met</Text>
          )}
          {isBehind && !isCompleted && !isLifetimeDone && (
            <Text style={styles.behindBadge}>Behind</Text>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
            {task.completionPriority === 'days' ? 'Days Rem.' : (task.completionPriority === 'chapters' ? 'Chapters Rem.' : 'Remaining')}
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {task.completionPriority === 'days' 
              ? `${remainingDays}d`
              : task.completionPriority === 'chapters'
              ? `${Math.max(0, (task.totalChapters || 0) - (task.completedChaptersCount || 0))}`
              : formatHours(remainingOverallSeconds / 3600)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
            Today
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatHours(currentCompletedTodayHours)} / {formatHours(task.dailyTargetHours)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
            {task.completionPriority === 'days' ? 'Days Done' : (task.completionPriority === 'chapters' ? 'Chapters' : 'Total')}
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {task.completionPriority === 'days'
              ? `${task.daysWorkedCount || 0}${task.totalDaysGoal ? ` / ${task.totalDaysGoal}` : ''}`
              : task.completionPriority === 'chapters'
              ? `${task.completedChaptersCount || 0}${task.totalChapters ? ` / ${task.totalChapters}` : ''}`
              : `${formatHours(totalCompletedSoFarSeconds / 3600)}${task.targetTotalHours ? ` / ${formatHours(task.targetTotalHours)}` : ''}`}
          </Text>
        </View>
      </View>

      <ProgressBar
        completed={currentCompletedTodayHours}
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

      {(task.totalDaysGoal || 0) > 0 && (
        <View style={{ marginTop: 4 }}>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
            Days: {task.daysWorkedCount || 0} / {task.totalDaysGoal}
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
      ) : (
        <TouchableOpacity
          onPress={handleStartTimer}
          disabled={isCompleted}
          style={[styles.startButton, { backgroundColor: isCompleted ? '#4CAF50' : colors.tint, marginTop: 12 }]}>
          <Text style={styles.startButtonText}>
            {isCompleted ? 'Daily Goal Met' : 'Start Timer'}
          </Text>
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
