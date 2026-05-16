import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTask } from '../../app-src/context/TaskContext';
import { Colors, EVENT_COLORS } from '../../app-src/constants/theme';
import { useColorScheme } from '../../app-src/hooks/use-color-scheme';
import { getAllTasksFlat } from '../../app-src/utils/carryOverLogic';
import { Task } from '../../app-src/types';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const { width } = Dimensions.get('window');
const CALENDAR_HPADDING = 16;
const GRID_WIDTH = width - (CALENDAR_HPADDING * 2);
const COLUMN_WIDTH = GRID_WIDTH / 7;

interface Event {
  taskId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  color: string;
  type: 'bar' | 'dot';
}

/**
 * Calendar Screen - Displays task deadlines and scheduled goals
 */
export default function CalendarScreen() {
  const systemColorScheme = useColorScheme();
  const { state, addTask, getTaskTodaySeconds } = useTask();
  const colors = Colors[state.themeMode === 'system' ? (systemColorScheme ?? 'light') : state.themeMode];

  const [currentMonth, setCurrentMonth] = useState(dayjs());
  
  // Add Task Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Refined Add Task State
  const [taskName, setTaskName] = useState('');
  const [dailyHours, setDailyHours] = useState('1');
  const [priorityType, setPriorityType] = useState<'days' | 'hours' | 'chapters' | 'none'>('days');
  const [totalGoal, setTotalGoal] = useState('30');
  const [deadline, setDeadline] = useState('');
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const allTasksInclusive = useMemo(() => {
    // We need to look through everything, including completed if they are stored in workspace
    return getAllTasksFlat(state.workspace);
  }, [state.workspace]);

  const handleTotalGoalChange = (val: string) => {
    setTotalGoal(val);
    if (priorityType === 'days' && val && selectedDate) {
      const days = parseInt(val);
      if (!isNaN(days) && days > 0) {
        const calculatedDeadline = dayjs(selectedDate).add(days - 1, 'day').format('YYYY-MM-DD');
        setDeadline(calculatedDeadline);
      }
    }
  };

  const handleDeadlineChange = (val: string) => {
    setDeadline(val);
    if (val.length === 10 && selectedDate) {
      const start = dayjs(selectedDate);
      const end = dayjs(val);
      if (end.isValid() && (end.isSame(start) || end.isAfter(start))) {
        const diff = end.diff(start, 'day') + 1;
        setTotalGoal(diff.toString());
        setPriorityType('days');
      }
    }
  };

  const onDeadlineChange = (event: any, selectedDateTime?: Date) => {
    setShowDeadlinePicker(Platform.OS === 'ios');
    if (selectedDateTime) {
      const formatted = dayjs(selectedDateTime).format('YYYY-MM-DD');
      setDeadline(formatted);
      if (selectedDate) {
        const start = dayjs(selectedDate);
        const end = dayjs(formatted);
        if (end.isValid() && (end.isSame(start) || end.isAfter(start))) {
          const diff = end.diff(start, 'day') + 1;
          setTotalGoal(diff.toString());
          setPriorityType('days');
        }
      }
    }
  };

  const events = useMemo(() => {
    const evts: Event[] = [];
    
    allTasksInclusive.forEach((task, index) => {
      // 1. Goal Bars (Duration based tasks)
      const start = task.scheduledDate || dayjs(task.createdAt).format('YYYY-MM-DD');
      
      // PRIORITIZE calculation from totalDaysGoal to ensure edits reflect immediately
      let end = task.deadlineDate;
      if (task.totalDaysGoal && task.totalDaysGoal > 0 && task.completionPriority === 'days') {
        end = dayjs(start).add(task.totalDaysGoal - 1, 'day').format('YYYY-MM-DD');
      } 
      // Fallback: estimate based on hours if no totalDaysGoal and no explicit deadline
      else if (!end && task.targetTotalHours && task.targetTotalHours > 0) {
        const estimatedDays = Math.ceil(task.targetTotalHours / (task.dailyTargetHours || 1));
        end = dayjs(start).add(estimatedDays - 1, 'day').format('YYYY-MM-DD');
      }

      if (end && dayjs(end).isAfter(dayjs(start))) {
        evts.push({
          taskId: task.id,
          name: task.name,
          startDate: start,
          endDate: end,
          color: EVENT_COLORS[index % EVENT_COLORS.length],
          type: 'bar',
        });
      }

      // 2. Daily Activity Dots
      if (task.sessions) {
        // Group sessions by date to avoid multiple dots for same task on same day
        const sessionDates = new Set(task.sessions.map(s => s.date));
        
        // Also check if it's being worked on today
        if (state.activeTimerTaskId === task.id || getTaskTodaySeconds(task) > 0) {
          sessionDates.add(dayjs().format('YYYY-MM-DD'));
        }

        sessionDates.forEach(dateStr => {
           evts.push({
             taskId: `${task.id}-dot-${dateStr}`,
             name: '•',
             startDate: dateStr,
             endDate: dateStr,
             color: EVENT_COLORS[index % EVENT_COLORS.length],
             type: 'dot',
           });
        });
      }
    });

    return evts;
  }, [allTasksInclusive, state.activeTimerTaskId]);

  // Generate calendar grid
  const calendarData = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day(); // 0 = Sunday
    const daysInMonth = currentMonth.daysInMonth();

    const days = [];
    
    // Previous month padding
    const prevMonth = currentMonth.subtract(1, 'month');
    const daysInPrevMonth = prevMonth.daysInMonth();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: prevMonth.date(daysInPrevMonth - i).format('YYYY-MM-DD'),
        dayNum: daysInPrevMonth - i,
        isPadding: true,
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: currentMonth.date(i).format('YYYY-MM-DD'),
        dayNum: i,
        isPadding: false,
      });
    }

    // Next month padding to fill the row
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: currentMonth.add(1, 'month').date(i).format('YYYY-MM-DD'),
        dayNum: i,
        isPadding: true,
      });
    }

    return days;
  }, [currentMonth]);

  const changeMonth = (direction: 'next' | 'prev') => {
    setCurrentMonth(prev => direction === 'next' ? prev.add(1, 'month') : prev.subtract(1, 'month'));
  };

  const renderCalendarRow = (weekDays: any[], weekIndex: number) => {
    const weekStart = dayjs(weekDays[0].date);
    const weekEnd = dayjs(weekDays[6].date);

    // Find events that overlap with this week
    const weekEvents = events.filter(event => {
      const eStart = dayjs(event.startDate);
      const eEnd = dayjs(event.endDate);
      return (
        (eStart.isSameOrBefore(weekEnd, 'day') && eEnd.isSameOrAfter(weekStart, 'day'))
      );
    });

    const barEvents = weekEvents.filter(e => e.type === 'bar');
    const dotEvents = weekEvents.filter(e => e.type === 'dot');

    return (
      <View key={`week-${weekIndex}`} style={styles.weekRow}>
        <View style={styles.daysBg}>
          {weekDays.map((day, i) => {
            const isPast = dayjs(day.date).isBefore(dayjs().startOf('day'));
            return (
              <TouchableOpacity 
                key={`bg-${day.date}`} 
                style={[styles.dayCell, i === 6 && { borderRightWidth: 0 }]}
                onPress={() => {
                  if (isPast) {
                    Alert.alert('Invalid Date', 'Cannot schedule tasks in the past.');
                    return;
                  }
                  setSelectedDate(day.date);
                  setShowAddModal(true);
                }}
              >
                <Text style={[
                  styles.dayNumber, 
                  { color: day.isPadding ? colors.tabIconDefault + '66' : colors.text },
                  day.date === dayjs().format('YYYY-MM-DD') && { color: colors.tint, fontWeight: 'bold' }
                ]}>
                  {day.dayNum}
                </Text>
                
                {/* Dots container */}
                <View style={styles.dotsContainer}>
                  {dotEvents.filter(de => de.startDate === day.date).map(de => (
                    <View key={de.taskId} style={[styles.dot, { backgroundColor: de.color }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.eventLayer}>
           {barEvents.map((event, idx) => {
             const eStart = dayjs(event.startDate);
             const eEnd = dayjs(event.endDate);
             
             // Calculate start and end index within the week (0-6)
             const startIndex = Math.max(0, eStart.diff(weekStart, 'day'));
             const endIndex = Math.min(6, eEnd.diff(weekStart, 'day'));
             
             if (startIndex > 6 || endIndex < 0) return null;

             const left = (startIndex / 7) * 100;
             const width = ((endIndex - startIndex + 1) / 7) * 100;

             return (
               <View 
                key={`${event.taskId}-${weekIndex}`} 
                style={[
                  styles.eventBar, 
                  { 
                    left: `${left}%`, 
                    width: `${width}%`, 
                    backgroundColor: event.color,
                    top: 25 + (idx * 18), // Move bars below date
                  }
                ]}
               >
                 <Text style={styles.eventText} numberOfLines={1}>
                   {event.name}
                 </Text>
               </View>
             );
           })}
        </View>
      </View>
    );
  };

  const rows = [];
  for (let i = 0; i < calendarData.length; i += 7) {
    rows.push(calendarData.slice(i, i + 7));
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {currentMonth.format('MMMM YYYY')}
        </Text>
        <View style={styles.navButtons}>
          <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.navButton}>
            <Text style={{ color: colors.tint, fontSize: 20 }}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrentMonth(dayjs())} style={styles.todayButton}>
            <Text style={{ color: colors.tint, fontWeight: '600' }}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeMonth('next')} style={styles.navButton}>
            <Text style={{ color: colors.tint, fontSize: 20 }}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dayLabels}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={[styles.dayLabel, { color: colors.tabIconDefault }]}>{day}</Text>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.calendarBody}>
        <View style={[styles.grid, { borderColor: colors.tabIconDefault + '22' }]}>
          {rows.map((row, i) => renderCalendarRow(row, i))}
        </View>
      </ScrollView>

      {/* Future Task Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeaderExtra}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Plan Task for {dayjs(selectedDate).format('MMM DD, YYYY')}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={{ color: colors.tint, fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.label, { color: colors.text }]}>Task Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault + '44' }]}
                placeholder="e.g., Project X"
                placeholderTextColor={colors.tabIconDefault}
                value={taskName}
                onChangeText={setTaskName}
              />

              <Text style={[styles.label, { color: colors.text }]}>Daily Target (Hours)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault + '44' }]}
                placeholder="2"
                keyboardType="numeric"
                value={dailyHours}
                onChangeText={setDailyHours}
              />

              <Text style={[styles.label, { color: colors.text }]}>Goal Type</Text>
              <View style={styles.priorityContainer}>
                {['days', 'hours', 'chapters', 'none'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.priorityButton,
                      priorityType === type && { backgroundColor: colors.tint }
                    ]}
                    onPress={() => setPriorityType(type as any)}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      priorityType === type && { color: 'white' }
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {priorityType !== 'none' && (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Total Goal ({priorityType})
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault + '44' }]}
                    placeholder="30"
                    keyboardType="numeric"
                    value={totalGoal}
                    onChangeText={handleTotalGoalChange}
                  />
                </>
              )}

              <Text style={[styles.label, { color: colors.text }]}>Deadline (Optional)</Text>
              <TouchableOpacity
                onPress={() => setShowDeadlinePicker(true)}
                style={[styles.input, { borderColor: colors.tabIconDefault + '44', justifyContent: 'center' }]}>
                <Text pointerEvents="none" style={{ color: deadline ? colors.text : colors.tabIconDefault }}>
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
                    minimumDate={selectedDate ? dayjs(selectedDate).toDate() : new Date()}
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
                  minimumDate={selectedDate ? dayjs(selectedDate).toDate() : new Date()}
                  onChange={onDeadlineChange}
                />
              )}

              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  if (!taskName) {
                    Alert.alert('Error', 'Please enter a task name');
                    return;
                  }
                  
                  const targetDaily = parseFloat(dailyHours) || 1;
                  const goalValue = parseFloat(totalGoal) || 0;
                  
                  // In TaskContext.tsx, addTask signature:
                  // addTask(name, dailyTargetHours, parentFolderId, totalChapters, targetTotalHours, daysToComplete, completionPriority, scheduledDate)
                  
                  addTask(
                    taskName, 
                    targetDaily, 
                    null, 
                    priorityType === 'chapters' ? goalValue : 0,
                    priorityType === 'hours' ? goalValue : 0,
                    priorityType === 'days' ? goalValue : null,
                    priorityType,
                    selectedDate!
                  );

                  setShowAddModal(false);
                  setTaskName('');
                  setDailyHours('1');
                  setTotalGoal('30');
                  setDeadline('');
                  Alert.alert('Success', 'Task scheduled!');
                }}
              >
                <Text style={styles.saveButtonText}>Confirm Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    padding: 8,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6C63FF22',
  },
  dayLabels: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarBody: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  grid: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  weekRow: {
    minHeight: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  daysBg: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dayCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)',
    padding: 4,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
  todayNumber: {
    color: '#6C63FF',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  eventLayer: {
    marginTop: 24, // Leave space for day numbers
    paddingHorizontal: 0,
    height: 70, // Fixed height for event bars area
  },
  eventBar: {
    position: 'absolute',
    height: 18,
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  eventText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  priorityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  priorityButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContentContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    minHeight: 400,
  },
  modalHeaderExtra: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {},
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});