import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Session } from '@/app-src/types';
import { Colors } from '@/app-example/constants/theme';
import { useColorScheme } from '@/app-example/hooks/use-color-scheme';
import { formatDateTime, formatTime, formatMinutes } from '@/app-src/utils/helpers';

interface SessionListItemProps {
  session: Session;
}

/**
 * Session list item - displays a single time tracking session
 */
export function SessionListItem({ session }: SessionListItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const durationStr = formatMinutes(session.duration);
  const startTimeStr = formatTime(session.startTime);
  const endTimeStr = session.endTime ? formatTime(session.endTime) : 'ongoing';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.tabIconDefault }]}>
      <View style={styles.row}>
        <View style={styles.timeSection}>
          <Text style={[styles.timeLabel, { color: colors.tabIconDefault }]}>
            {startTimeStr} – {endTimeStr}
          </Text>
          <Text style={[styles.duration, { color: colors.text }]}>
            {durationStr}
          </Text>
        </View>
        {session.notes && (
          <Text style={[styles.notes, { color: colors.tabIconDefault }]}>
            {session.notes}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSection: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    fontWeight: '600',
  },
  notes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 8,
    flex: 1,
  },
});
