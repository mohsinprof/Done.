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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorMode].tint,
        headerShown: true,
        tabBarButton: HapticTab,
        headerStyle: { backgroundColor: Colors[colorMode].background },
        headerTintColor: Colors[colorMode].text,
        tabBarStyle: { backgroundColor: Colors[colorMode].background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="folders"
        options={{
          title: 'Folders',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="folder.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.line.uptrend.xyaxis" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
