import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/../app-example/constants/theme';
import { useColorScheme } from '@/../app-example/hooks/use-color-scheme';
import { formatHours } from '@/app-src/utils/helpers';

interface ProgressBarProps {
  completed: number;
  target: number;
  showLabel?: boolean;
  height?: number;
}

/**
 * Progress bar component - shows completed vs target hours
 */
export function ProgressBar({ completed, target, showLabel = true, height = 8 }: ProgressBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const percentage = target > 0 ? Math.min(100, (completed / target) * 100) : 0;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.background,
          { height, backgroundColor: colors.tabIconDefault },
        ]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: colors.tint,
              height,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: colors.text }]}>
          {formatHours(completed)} / {formatHours(target)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  background: {
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
