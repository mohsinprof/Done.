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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useTask } from '../../app-src/context/TaskContext';
import { Colors } from '../../app-src/constants/theme';
import { useColorScheme } from '../../app-src/hooks/use-color-scheme';
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
  const [priorityType, setPriorityType] = useState<'hours' | 'chapters' | 'days' | 'none'>('hours');
  const [totalGoal, setTotalGoal] = useState('0');
  const [startDate, setStartDate] = useState(getTodayDate());
  const [deadline, setDeadline] = useState('');
  
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const [activeTaskName, setActiveTaskName] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update tasks list
  useEffect(() => {
    const allTasks = getAllTasksFlat(state.workspace);
    const sortedTasks = sortTasksByPriority(allTasks);
    
    // Custom sort: Put active task on TOP
    if (state.activeTimerTaskId) {
      const activeIdx = sortedTasks.findIndex(t => t.id === state.activeTimerTaskId);
      if (activeIdx > -1) {
        const [activeTask] = sortedTasks.splice(activeIdx, 1);
        sortedTasks.unshift(activeTask);
      }
    }
    
    setTasks(sortedTasks);
  }, [state.workspace, state.activeTimerTaskId]);

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

  const handleTotalGoalChange = (val: string) => {
    setTotalGoal(val);
    if (priorityType === 'days' && val && startDate) {
      const days = parseInt(val);
      if (!isNaN(days) && days > 0) {
        const calculatedDeadline = dayjs(startDate).add(days - 1, 'day').format('YYYY-MM-DD');
        setDeadline(calculatedDeadline);
      }
    }
  };

  const handleDeadlineChange = (val: string) => {
    setDeadline(val);
    if (val.length === 10 && startDate) {
      const start = dayjs(startDate);
      const end = dayjs(val);
      if (end.isValid() && (end.isSame(start) || end.isAfter(start))) {
        const diff = end.diff(start, 'day') + 1;
        setTotalGoal(diff.toString());
        setPriorityType('days');
      }
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const formatted = dayjs(selectedDate).format('YYYY-MM-DD');
      setStartDate(formatted);
      // Recalculate deadline if priority is days
      if (priorityType === 'days' && totalGoal) {
        const days = parseInt(totalGoal);
        if (!isNaN(days) && days > 0) {
          setDeadline(dayjs(formatted).add(days - 1, 'day').format('YYYY-MM-DD'));
        }
      }
    }
  };

  const onDeadlineChange = (event: any, selectedDate?: Date) => {
    setShowDeadlinePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const formatted = dayjs(selectedDate).format('YYYY-MM-DD');
      handleDeadlineChange(formatted);
    }
  };

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

    const goalVal = parseFloat(totalGoal) || 0;
    
    // Call Context AddTask with Pro fields
    addTask(
      taskName.trim(), 
      dailyTotal, 
      null, 
      priorityType === 'chapters' ? goalVal : 0, 
      priorityType === 'hours' ? goalVal : 0, 
      priorityType === 'days' ? goalVal : null, 
      priorityType,
      startDate
    );

    setTaskName('');
    setDailyHours('2');
    setDailyMinutes('0');
    setTotalGoal('0');
    setPriorityType('hours');
    setStartDate(getTodayDate());
    setDeadline('');
    setShowAddModal(false);
  };

  const activeTasks = tasks.filter(t => !t.isLifetimeCompleted);
  const completedTasks = tasks.filter(t => t.isLifetimeCompleted);

  const todayCompleted = getTodayTotalHours();
  const totalDailyTarget = activeTasks.reduce((sum, t) => sum + t.dailyTargetHours, 0);

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
        
        {/* Dashboard Banner Tip */}
        <View style={[styles.infoBanner, { backgroundColor: colors.tint + '15' }]}>
           <Text style={[styles.infoText, { color: colors.tint }]}>
             Future tasks can be added in the Calendar
           </Text>
        </View>

        {/* Today's Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.tint, opacity: 0.95 }]}>
          <Text style={styles.summaryTitle}>Today&apos;s Progress</Text>

          <View style={styles.summaryStats}>
            <View style={styles.statBlock}>
              <Text style={styles.statBlockLabel}>Today&apos;s Work</Text>
              <Text style={styles.statBlockValue}>{formatHours(todayCompleted)}</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statBlockLabel}>Today&apos;s Goal</Text>
              <Text style={styles.statBlockValue}>{formatHours(totalDailyTarget)}</Text>
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
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Task Name</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.tabIconDefault + '22',
                    color: colors.text,
                    borderColor: colors.tint,
                  },
                ]}
                placeholder="e.g., Study, Project, Reading"
                placeholderTextColor={colors.tabIconDefault}
                value={taskName}
                onChangeText={setTaskName}
              />

              <Text style={[styles.modalLabel, { color: colors.text }]}>Daily Target (Goal per day)</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: colors.tabIconDefault + '22',
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
                        backgroundColor: colors.tabIconDefault + '22',
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

              <Text style={[styles.modalLabel, { color: colors.text }]}>Start Date</Text>
              <TouchableOpacity
                onPress={() => setShowStartDatePicker(true)}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.tabIconDefault + '22',
                    borderColor: colors.tint,
                    justifyContent: 'center',
                  },
                ]}>
                <Text style={{ color: colors.text }}>
                  {startDate}
                </Text>
              </TouchableOpacity>
              {showStartDatePicker && Platform.OS === 'ios' && (
                <View style={{ backgroundColor: colors.tabIconDefault + '11', borderRadius: 12, padding: 8, marginBottom: 15 }}>
                  <DateTimePicker
                    value={dayjs(startDate).toDate()}
                    mode="date"
                    display="spinner"
                    style={{ height: 120 }}
                    onChange={onStartDateChange}
                  />
                  <TouchableOpacity 
                    style={{ alignSelf: 'flex-end', padding: 8 }}
                    onPress={() => setShowStartDatePicker(false)}
                  >
                    <Text style={{ color: colors.tint, fontWeight: 'bold' }}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
              {showStartDatePicker && Platform.OS !== 'ios' && (
                <DateTimePicker
                  value={dayjs(startDate).toDate()}
                  mode="date"
                  display="default"
                  onChange={onStartDateChange}
                />
              )}

              <Text style={[styles.modalLabel, { color: colors.text }]}>Priority Type (Completion Logic)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {(['hours', 'chapters', 'days', 'none'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriorityType(p)}
                    style={{
                      flex: 1,
                      minWidth: '45%',
                      padding: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.tint,
                      backgroundColor: priorityType === p ? colors.tint : 'transparent',
                      alignItems: 'center',
                    }}>
                    <Text style={{ color: priorityType === p ? 'white' : colors.text, fontSize: 12, textTransform: 'capitalize', fontWeight: 'bold' }}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: colors.text }]}>Total Goal ({priorityType})</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.tabIconDefault + '22',
                    color: colors.text,
                    borderColor: colors.tint,
                  },
                ]}
                placeholder={`e.g., 50 ${priorityType}`}
                placeholderTextColor={colors.tabIconDefault}
                value={totalGoal}
                onChangeText={handleTotalGoalChange}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.modalLabel, { color: colors.text }]}>Deadline (Optional)</Text>
              <TouchableOpacity
                onPress={() => setShowDeadlinePicker(true)}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.tabIconDefault + '22',
                    borderColor: colors.tint,
                    justifyContent: 'center',
                  },
                ]}>
                <Text style={{ color: deadline ? colors.text : colors.tabIconDefault }}>
                  {deadline || 'Select Deadline'}
                </Text>
              </TouchableOpacity>
              {showDeadlinePicker && Platform.OS === 'ios' && (
                <View style={{ backgroundColor: colors.tabIconDefault + '11', borderRadius: 12, padding: 8, marginBottom: 15 }}>
                   <DateTimePicker
                    value={deadline ? dayjs(deadline).toDate() : new Date()}
                    mode="date"
                    display="spinner"
                    style={{ height: 120 }}
                    minimumDate={startDate ? dayjs(startDate).toDate() : new Date()}
                    onChange={onDeadlineChange}
                  />
                  <TouchableOpacity 
                    style={{ alignSelf: 'flex-end', padding: 8 }}
                    onPress={() => setShowDeadlinePicker(false)}
                  >
                    <Text style={{ color: colors.tint, fontWeight: 'bold' }}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
              {showDeadlinePicker && Platform.OS !== 'ios' && (
                <DateTimePicker
                  value={deadline ? dayjs(deadline).toDate() : new Date()}
                  mode="date"
                  display="default"
                  minimumDate={startDate ? dayjs(startDate).toDate() : new Date()}
                  onChange={onDeadlineChange}
                />
              )}

              <TouchableOpacity
                onPress={handleAddTask}
                style={[styles.modalButton, { backgroundColor: colors.tint, marginTop: 10, marginBottom: 40 }]}>
                <Text style={styles.modalButtonText}>Create Pro Task</Text>
              </TouchableOpacity>
            </ScrollView>
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
  infoBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
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
