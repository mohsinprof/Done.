import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/app-example/hooks/use-color-scheme';
import { TaskProvider } from '@/app-src/context/TaskContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <TaskProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="task-detail" 
            options={{ 
              presentation: 'modal',
              title: 'Task Details',
              headerShown: true,
            }} 
          />
          <Stack.Screen 
            name="add-task" 
            options={{ 
              presentation: 'modal',
              title: 'Add Task',
              headerShown: true,
            }} 
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </TaskProvider>
  );
}
