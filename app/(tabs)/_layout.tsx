import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '../../app-src/components/haptic-tab';
import { IconSymbol } from '../../app-src/components/ui/icon-symbol';
import { Colors } from '../../app-src/constants/theme';
import { useColorScheme } from '../../app-src/hooks/use-color-scheme';

import { useTask } from '../../app-src/context/TaskContext';

export default function TabLayout() {
  const systemColorScheme = useColorScheme();
  const { state } = useTask();
  const colorMode = state?.themeMode === 'system' ? (systemColorScheme ?? 'light') : (state?.themeMode ?? 'light');
  const colors = Colors[colorMode];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: true,
        tabBarButton: HapticTab,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 10,
          paddingBottom: 10,
          paddingHorizontal: 10,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarItemStyle: {
          marginHorizontal: 4,
          borderRadius: 16,
          paddingVertical: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={32} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="folders"
        options={{
          title: 'Folders',
          tabBarIcon: ({ color }) => <IconSymbol size={32} name="folder.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <IconSymbol size={32} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <IconSymbol size={32} name="chart.line.uptrend.xyaxis" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={32} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
