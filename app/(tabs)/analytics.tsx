import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
  FlatList,
} from 'react-native';
import { useTask } from '../../app-src/context/TaskContext';
import { Colors } from '../../app-src/constants/theme';
import { useColorScheme } from '../../app-src/hooks/use-color-scheme';
import { getAllTasksFlat, getTodayDate } from '../../app-src/utils/carryOverLogic';
import dayjs from 'dayjs';

/**
 * Analytics Screen - displays progress analytics and breakdowns
 */
export default function AnalyticsScreen() {
  const systemColorScheme = useColorScheme();
  const { state, getTodayTotalHours } = useTask();
  
  const colors = Colors[state.themeMode === 'system' ? (systemColorScheme ?? 'light') : state.themeMode];

  const windowWidth = Dimensions.get('window').width;

  const analytics = useMemo(() => {
    const tasks = getAllTasksFlat(state.workspace);
    const today = getTodayDate();

    // Recent 7 days breakdown
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD');
      const dayLabel = dayjs(date).format('MMM D');
      let totalHours = 0;

      tasks.forEach((task) => {
        if (task.sessions) {
          task.sessions
            .filter((s) => s.date === date)
            .forEach((s) => {
              totalHours += s.duration / 60;
            });
        }
      });

      return { date, dayLabel, hours: Math.round(totalHours * 10) / 10 };
    });

    // Task-wise breakdown
    const taskBreakdown = tasks
      .map((task) => {
        let totalHours = 0;
        if (task.sessions) {
          task.sessions.forEach((s) => {
            totalHours += s.duration / 60;
          });
        }
        return { name: task.name, hours: Math.round(totalHours * 10) / 10 };
      })
      .filter((t) => t.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    // Weekly summary
    const weekStart = dayjs().startOf('week').format('YYYY-MM-DD');
    const weekEnd = dayjs().endOf('week').format('YYYY-MM-DD');
    let weeklyTotal = 0;

    tasks.forEach((task) => {
      if (task.sessions) {
        task.sessions
          .filter((s) => s.date >= weekStart && s.date <= weekEnd)
          .forEach((s) => {
            weeklyTotal += s.duration / 60;
          });
      }
    });

    return {
      last7Days,
      taskBreakdown,
      weeklyTotal: Math.round(weeklyTotal * 10) / 10,
      todayTotal: getTodayTotalHours(),
    };
  }, [state.workspace, getTodayTotalHours]);

  const maxHours = Math.max(...analytics.last7Days.map((d) => d.hours), 5);
  const barHeight = 150;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.tint, borderColor: colors.tint },
            ]}>
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.summaryValue}>{analytics.todayTotal.toFixed(1)}h</Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.tabIconDefault, borderColor: colors.text },
            ]}>
            <Text style={styles.summaryLabel}>This Week</Text>
            <Text style={styles.summaryValue}>{analytics.weeklyTotal.toFixed(1)}h</Text>
          </View>
        </View>

        {/* Last 7 Days Bar Chart */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Last 7 Days</Text>
          <View style={[styles.chart, { backgroundColor: colors.tabIconDefault }]}>
            <View style={styles.barsContainer}>
              {analytics.last7Days.map((day, index) => {
                const barHeightPercent = (day.hours / maxHours) * barHeight;
                return (
                  <View key={index} style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeightPercent,
                          backgroundColor: colors.tint,
                        },
                      ]}
                    />
                    <Text style={[styles.barLabel, { color: colors.text }]}>
                      {day.dayLabel}
                    </Text>
                    <Text style={[styles.barValue, { color: colors.text }]}>
                      {day.hours.toFixed(1)}h
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Task Breakdown */}
        {analytics.taskBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Task Breakdown (Lifetime)
            </Text>
            <FlatList
              data={analytics.taskBreakdown}
              scrollEnabled={false}
              keyExtractor={(item) => item.name}
              renderItem={({ item, index }) => {
                const totalTaskHours = Math.max(...analytics.taskBreakdown.map((t) => t.hours));
                const percentage = (item.hours / totalTaskHours) * 100;
                return (
                  <View
                    key={index}
                    style={[
                      styles.taskBreakdownItem,
                      { backgroundColor: colors.background },
                    ]}>
                    <View style={styles.taskBreakdownLabel}>
                      <Text style={[styles.taskName, { color: colors.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.taskHours, { color: colors.tabIconDefault }]}>
                        {item.hours.toFixed(1)}h
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.taskBreakdownBar,
                        { backgroundColor: colors.tabIconDefault },
                      ]}>
                      <View
                        style={{
                          height: '100%',
                          width: `${percentage}%`,
                          backgroundColor: colors.tint,
                          borderRadius: 4,
                        }}
                      />
                    </View>
                  </View>
                );
              }}
            />
          </View>
        )}

        {analytics.taskBreakdown.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: colors.tabIconDefault }]}>
              No data yet. Start tracking time to see analytics!
            </Text>
          </View>
        )}
      </ScrollView>
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
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
    padding: 12,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    gap: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  barValue: {
    fontSize: 10,
    fontWeight: '500',
  },
  taskBreakdownItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  taskBreakdownLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskName: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskHours: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskBreakdownBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
