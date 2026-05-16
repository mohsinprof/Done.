import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTask } from '../../app-src/context/TaskContext';
import { Colors, EVENT_COLORS } from '../../app-src/constants/theme';
import { useColorScheme } from '../../app-src/hooks/use-color-scheme';
import { getAllTasksFlat } from '../../app-src/utils/carryOverLogic';
import { formatHours } from '../../app-src/utils/helpers';
import dayjs from 'dayjs';

const BAR_CHART_HEIGHT = 200;
const BAR_MAX_HEIGHT = BAR_CHART_HEIGHT * 0.8; // 160px — explicit pixels, no percentage

/**
 * Analytics Screen - displays progress analytics and breakdowns
 */
export default function AnalyticsScreen() {
  const systemColorScheme = useColorScheme();
  const { state, getTodayTotalHours } = useTask();
  const [tick, setTick] = useState(0);
  const today = dayjs().format('YYYY-MM-DD');

  const isDark = (state.themeMode === 'system' ? systemColorScheme : state.themeMode) === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((current) => current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getTaskTotalSeconds = (task: (ReturnType<typeof getAllTasksFlat>[number])) => {
    let totalSeconds = 0;

    if (task.sessions) {
      task.sessions.forEach((session) => {
        totalSeconds += session.duration * 60;
      });
    }

    if (state.activeTimerTaskId === task.id && state.activeTimerStartTime) {
      totalSeconds += Math.floor((Date.now() - state.activeTimerStartTime) / 1000);
    } else {
      totalSeconds += task.currentSessionElapsedSeconds || 0;
    }

    return totalSeconds;
  };

  const analytics = useMemo(() => {
    const tasks = getAllTasksFlat(state.workspace);

    // --- Last 7 days breakdown ---
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD');
      const dayLabel = dayjs(date).format('ddd');
      let totalSeconds = 0;

      tasks.forEach((task) => {
        if (task.sessions) {
          task.sessions
            .filter((s) => s.date === date)
            .forEach((s) => {
              totalSeconds += s.duration * 60; // s.duration is in minutes
            });
        }

        if (date === today) {
          totalSeconds += task.currentSessionElapsedSeconds || 0;

          if (state.activeTimerTaskId === task.id && state.activeTimerStartTime) {
            totalSeconds += Math.floor((Date.now() - state.activeTimerStartTime) / 1000);
          }
        }
      });

      return { date, dayLabel, totalSeconds };
    });

    // --- Task-wise breakdown (all time) ---
    const taskMap = new Map<string, { id: string; name: string; totalSeconds: number; goalSeconds: number }>();

    tasks.forEach((task) => {
      const taskTotalSeconds = getTaskTotalSeconds(task);
      const goalSeconds = Math.max(
        Math.round((task.targetTotalHours || task.dailyTargetHours || 1) * 3600),
        1
      );

      const existing = taskMap.get(task.id) || {
        id: task.id,
        name: task.name,
        totalSeconds: 0,
        goalSeconds,
      };
      taskMap.set(task.id, {
        id: task.id,
        name: task.name,
        totalSeconds: existing.totalSeconds + taskTotalSeconds,
        goalSeconds,
      });
    });

    const taskBreakdown = Array.from(taskMap.values())
      .filter((t) => t.totalSeconds > 0)
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    // --- Weekly summary ---
    const weekStart = dayjs().startOf('week').format('YYYY-MM-DD');
    const weekEnd = dayjs().endOf('week').format('YYYY-MM-DD');
    let weeklyTotalSeconds = 0;

    tasks.forEach((task) => {
      if (task.sessions) {
        task.sessions
          .filter((s) => s.date >= weekStart && s.date <= weekEnd)
          .forEach((s) => {
            weeklyTotalSeconds += s.duration * 60;
          });
      }

      if (state.activeTimerTaskId === task.id && state.activeTimerStartTime) {
        if (today >= weekStart && today <= weekEnd) {
          weeklyTotalSeconds += Math.floor((Date.now() - state.activeTimerStartTime) / 1000);
        }
      }

      if (today >= weekStart && today <= weekEnd) {
        weeklyTotalSeconds += task.currentSessionElapsedSeconds || 0;
      }
    });

    const todayTotalSeconds = Math.round(getTodayTotalHours() * 3600);

    return {
      last7Days,
      taskBreakdown,
      weeklyTotalSeconds,
      todayTotalSeconds,
    };
  }, [state.workspace, state.activeTimerTaskId, state.activeTimerStartTime, getTodayTotalHours, tick]);

  const maxSeconds = Math.max(
    ...analytics.last7Days.map((d) => d.totalSeconds),
    3600 // minimum 1-hour scale so bars don't look huge on empty days
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary Cards ── */}
        <View style={styles.summaryGrid}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: isDark ? '#2D3748' : '#FFFFFF', shadowColor: '#000' },
              styles.cardShadow,
            ]}
          >
            <View style={[styles.cardTag, { backgroundColor: '#6C63FF' }]} />
            <Text style={[styles.summaryLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>
              Today
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatHours(analytics.todayTotalSeconds / 3600)}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: isDark ? '#2D3748' : '#FFFFFF', shadowColor: '#000' },
              styles.cardShadow,
            ]}
          >
            <View style={[styles.cardTag, { backgroundColor: '#4ECDC4' }]} />
            <Text style={[styles.summaryLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>
              This Week
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatHours(analytics.weeklyTotalSeconds / 3600)}
            </Text>
          </View>
        </View>

        {/* ── Last 7 Days Bar Chart ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Last 7 Days</Text>
          <View
            style={[
              styles.chartContainer,
              { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' },
              styles.cardShadow,
            ]}
          >
            <View style={[styles.barsContainer, { height: BAR_CHART_HEIGHT }]}>
              {analytics.last7Days.map((day, index) => {
                // FIX: calculate explicit pixel height instead of percentage
                const rawBarHeightPx = (day.totalSeconds / maxSeconds) * BAR_MAX_HEIGHT;
                const barHeightPx = day.totalSeconds > 0 ? Math.max(rawBarHeightPx, 16) : 0;

                return (
                  <View key={index} style={styles.barColumn}>
                    {/* Background track */}
                    <View
                      style={[
                        styles.barBackground,
                        {
                          backgroundColor: isDark ? '#1A202C' : '#EDF2F7',
                          height: BAR_MAX_HEIGHT, // ✅ explicit pixel height
                        },
                      ]}
                    >
                      {/* Filled bar — explicit pixel height, grows from bottom */}
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: barHeightPx, // ✅ explicit pixel height
                            backgroundColor: '#6C63FF',
                          },
                        ]}
                      />
                    </View>

                    <Text
                      style={[
                        styles.barValueText,
                        { color: isDark ? '#A0AEC0' : '#718096' },
                      ]}
                    >
                      {formatHours(day.totalSeconds / 3600)
                        .replace('h', '')
                        .replace('m', '')}
                    </Text>
                    <Text
                      style={[
                        styles.barLabelText,
                        { color: colors.text, fontWeight: '600' },
                      ]}
                    >
                      {day.dayLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Task Breakdown ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Task Breakdown</Text>
          {analytics.taskBreakdown.length > 0 ? (
            <View
              style={[
                styles.breakdownContainer,
                { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' },
                styles.cardShadow,
              ]}
            >
              {analytics.taskBreakdown.map((item, index) => {
                const percentage = Math.min((item.totalSeconds / item.goalSeconds) * 100, 100);
                const barColor = EVENT_COLORS[index % EVENT_COLORS.length];

                return (
                  <View key={item.id} style={styles.breakdownItem}>
                    <View style={styles.breakdownHeader}>
                      <Text
                        style={[styles.taskName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.taskHours,
                          { color: isDark ? '#A0AEC0' : '#718096' },
                        ]}
                      >
                        {formatHours(item.totalSeconds / 3600)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: isDark ? '#1A202C' : '#EDF2F7' },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${percentage}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyStateText,
                  { color: isDark ? '#A0AEC0' : '#718096' },
                ]}
              >
                No data yet. Start tracking time to see analytics!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  cardTag: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardShadow: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 4,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 20,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  // height is set via inline style — explicit pixels, not percentage
  barBackground: {
    width: '100%',
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  barValueText: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  barLabelText: {
    fontSize: 11,
  },
  breakdownContainer: {
    borderRadius: 20,
    padding: 20,
  },
  breakdownItem: {
    marginBottom: 20,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  taskHours: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});