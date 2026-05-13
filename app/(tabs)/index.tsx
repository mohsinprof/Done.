import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTask } from '../../app-src/context/TaskContext';
import { Colors } from '../../app-example/constants/theme';
import { useColorScheme } from '../../app-example/hooks/use-color-scheme';
import { TaskCard } from '../../app-src/components/TaskCard';
import { ProgressBar } from '../../app-src/components/ProgressBar';
import { getAllTasksFlat, getTodayDate } from '../../app-src/utils/carryOverLogic';
import { formatHours, sortTasksByPriority } from '../../app-src/utils/helpers';
import { Task as TaskCardType } from '../../app-src/types';

/**
 * Dashboard Screen - displays today's tasks and progress summary
 */
export default function DashboardScreen() {
  const systemColorScheme = useColorScheme();
  const router = useRouter();
  const { state, getTodayTotalHours, addTask, startTimer, getActiveTaskName, getTaskById: getTaskByIdFromContext, pauseTimer, deleteCompletedTasks } = useTask();
  
  const colors = Colors[state.themeMode === 'system' ? (systemColorScheme ?? 'light') : state.themeMode];

  const [tasks, setTasks] = useState<TaskCardType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [dailyHours, setDailyHours] = useState('2');
  const [dailyMinutes, setDailyMinutes] = useState('0');
  const [totalHoursGoal, setTotalHoursGoal] = useState('0');
  const [daysGoal, setDaysGoal] = useState('');
  const [totalChapters, setTotalChapters] = useState('0');
  const [completionPriority, setCompletionPriority] = useState<'hours' | 'chapters' | 'days'>('hours');
  const [activeTaskName, setActiveTaskName] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update tasks list
  useEffect(() => {
    const allTasks = getAllTasksFlat(state.workspace);
    const sortedTasks = sortTasksByPriority(allTasks);
    setTasks(sortedTasks);
  }, [state.workspace]);

  // Update active task display
  useEffect(() => {
    const name = getActiveTaskName();
    setActiveTaskName(name);
  }, [state.activeTimerTaskId, getActiveTaskName]);

  // Live timer update
  useEffect(() => {
    if (!state.activeTimerStartTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const sessionElapsed = Math.floor((now - (state.activeTimerStartTime ?? 0)) / 1000);
      
      const currentTask = state.activeTimerTaskId ? getTaskByIdFromContext(state.activeTimerTaskId) : null;
      const accumulated = currentTask?.currentSessionElapsedSeconds || 0;
      
      setElapsedTime(sessionElapsed + accumulated);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.activeTimerStartTime, state.activeTimerTaskId]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 300);
  };

  const handleAddTask = () => {
    if (!taskName.trim()) {
      Alert.alert('Error', 'Task name is required');
      return;
    }

    const hours = parseFloat(dailyHours) || 0;
    const minutes = parseFloat(dailyMinutes) || 0;
    const dailyTotal = hours + (minutes / 60);

    if (dailyTotal <= 0) {
      Alert.alert('Error', 'Daily target must be greater than zero');
      return;
    }

    const totalGoalInput = parseFloat(totalHoursGoal) || 0;
    // If user sets a goal of 0 or doesn't set it, but sets a daily target, 
    // and it's intended to be a one-time task, we should handle it.
    // However, to keep it simple: if totalGoal is 0, we'll default it to the dailyTarget 
    // so it finishes as soon as today's work is done.
    const totalGoal = totalGoalInput === 0 ? dailyTotal : totalGoalInput;
    
    const days = parseInt(daysGoal) || null;

    addTask(taskName.trim(), dailyTotal, null, parseInt(totalChapters) || 0, totalGoal, days, completionPriority);
    setTaskName('');
    setDailyHours('2');
    setDailyMinutes('0');
    setTotalHoursGoal('0');
    setDaysGoal('');
    setTotalChapters('0');
    setCompletionPriority('hours');
    setShowAddModal(false);
  };

  const todayTotal = getTodayTotalHours();
  const activeTasks = tasks.filter(t => !t.isLifetimeCompleted);
  const completedTasks = tasks.filter(t => t.isLifetimeCompleted);

  const totalDailyTarget = activeTasks.reduce((sum, t) => sum + t.dailyTargetHours, 0);
  const todayCompleted = tasks.reduce((sum, t) => sum + t.completedTodayHours, 0);

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.scrollContent}>
        {/* Today's Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.tint, opacity: 0.95 }]}>
          <Text style={styles.summaryTitle}>Today's Progress</Text>

          <View style={styles.summaryStats}>
            <View style={styles.statBlock}>
              <Text style={styles.statBlockLabel}>Total Hours</Text>
              <Text style={styles.statBlockValue}>{formatHours(todayTotal)}</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statBlockLabel}>Target</Text>
              <Text style={styles.statBlockValue}>{formatHours(totalDailyTarget)}</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statBlockLabel}>Completed</Text>
              <Text style={styles.statBlockValue}>{formatHours(todayCompleted)}</Text>
            </View>
          </View>

          <View style={styles.summaryProgress}>
            <ProgressBar
              completed={todayCompleted}
              target={totalDailyTarget}
              showLabel={false}
              height={10}
            />
          </View>
        </View>

        {/* Active Timer Display */}
        {activeTaskName && (
          <View
            style={[
              styles.activeTimerCard,
              { backgroundColor: '#4CAF50', borderColor: '#45a049' },
            ]}>
            <Text style={styles.activeTimerLabel}>Currently Working On</Text>
            <Text style={styles.activeTimerName}>{activeTaskName}</Text>
            <Text style={styles.activeTimerTime}>{formatElapsedTime(elapsedTime)}</Text>
            
            <TouchableOpacity 
              onPress={() => pauseTimer()}
              style={{
                marginTop: 10,
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>PAUSE TRACKING</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tasks List Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Active Tasks ({activeTasks.length})
          </Text>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={[styles.addButton, { backgroundColor: colors.tint }]}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Active Tasks List */}
        {activeTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: colors.tabIconDefault }]}>
              No active tasks. Create one or check your completed goals!
            </Text>
          </View>
        ) : (
          <FlatList
            data={activeTasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TaskCard task={item} />}
            scrollEnabled={false}
          />
        )}

        {/* Completed Section */}
        {completedTasks.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: '#4CAF50' }]}>
                Completed Goals ({completedTasks.length})
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Delete All',
                    'Are you sure you want to delete all completed tasks?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete All', style: 'destructive', onPress: deleteCompletedTasks },
                    ]
                  );
                }}
                style={{ paddingHorizontal: 10 }}>
                <Text style={{ color: '#ff6b6b', fontWeight: 'bold' }}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={completedTasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <TaskCard task={item} />}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Task</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={[styles.closeButton, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.modalLabel, { color: colors.text }]}>Task Name</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.tabIconDefault,
                  color: colors.text,
                  borderColor: colors.tint,
                },
              ]}
              placeholder="e.g., Study, FYP, Reading"
              placeholderTextColor={colors.tabIconDefault}
              value={taskName}
              onChangeText={setTaskName}
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Daily Target</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.tabIconDefault,
                      color: colors.text,
                      borderColor: colors.tint,
                    },
                  ]}
                  placeholder="Hours"
                  placeholderTextColor={colors.tabIconDefault}
                  value={dailyHours}
                  onChangeText={setDailyHours}
                  keyboardType="decimal-pad"
                />
                <Text style={{ fontSize: 10, color: colors.text, marginTop: -15, marginBottom: 10 }}>Hours</Text>
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.tabIconDefault,
                      color: colors.text,
                      borderColor: colors.tint,
                    },
                  ]}
                  placeholder="Minutes"
                  placeholderTextColor={colors.tabIconDefault}
                  value={dailyMinutes}
                  onChangeText={setDailyMinutes}
                  keyboardType="decimal-pad"
                />
                <Text style={{ fontSize: 10, color: colors.text, marginTop: -15, marginBottom: 10 }}>Minutes</Text>
              </View>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>How many days? (Optional)</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.tabIconDefault,
                  color: colors.text,
                  borderColor: colors.tint,
                },
              ]}
              placeholder="e.g., 30"
              placeholderTextColor={colors.tabIconDefault}
              value={daysGoal}
              onChangeText={setDaysGoal}
              keyboardType="number-pad"
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Total Goal (Optional)</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.tabIconDefault,
                  color: colors.text,
                  borderColor: colors.tint,
                },
              ]}
              placeholder="e.g., 100 (hours)"
              placeholderTextColor={colors.tabIconDefault}
              value={totalHoursGoal}
              onChangeText={setTotalHoursGoal}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Total Chapters (Optional)</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.tabIconDefault,
                  color: colors.text,
                  borderColor: colors.tint,
                },
              ]}
              placeholder="e.g., 12"
              placeholderTextColor={colors.tabIconDefault}
              value={totalChapters}
              onChangeText={setTotalChapters}
              keyboardType="number-pad"
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>What decides completion?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {(['hours', 'chapters', 'days'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setCompletionPriority(p)}
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.tint,
                    backgroundColor: completionPriority === p ? colors.tint : 'transparent',
                    alignItems: 'center',
                  }}>
                  <Text style={{ color: completionPriority === p ? 'white' : colors.text, fontSize: 12, textTransform: 'capitalize' }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleAddTask}
              style={[styles.modalButton, { backgroundColor: colors.tint }]}>
              <Text style={styles.modalButtonText}>Create Task</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    gap: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBlock: {
    alignItems: 'center',
  },
  statBlockLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  statBlockValue: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  summaryProgress: {
    marginTop: 8,
  },
  activeTimerCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    gap: 8,
  },
  activeTimerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  activeTimerName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  activeTimerTime: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 20,
    fontSize: 14,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
