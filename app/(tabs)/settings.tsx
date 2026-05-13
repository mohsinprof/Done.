import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Share,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTask } from '@/app-src/context/TaskContext';
import { Colors } from '@/app-example/constants/theme';
import { useColorScheme } from '@/app-example/hooks/use-color-scheme';

/**
 * Settings Screen - app configuration and data management
 */
export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const { state, clearAllData, exportAppData, setTheme } = useTask();
  const colors = Colors[state.themeMode === 'system' ? (colorScheme ?? 'light') : state.themeMode];

  const [isExporting, setIsExporting] = useState(false);

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your tasks, sessions, and history. This cannot be undone.',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Clear All',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Success', 'All data has been cleared.');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const data = await exportAppData();
      
      // Create a blob-like object and share it
      const fileName = `productivity_tracker_${new Date().getTime()}.json`;
      
      await Share.share({
        message: `Here is your backup of all tasks and sessions:\n\n${data}`,
        title: 'Export Productivity Tracker Data',
      });

      setIsExporting(false);
    } catch (error) {
      setIsExporting(false);
      Alert.alert('Error', 'Failed to export data');
      console.error('Export error:', error);
    }
  };

  const renderSettingRow = (
    title: string,
    subtitle?: string,
    onPress?: () => void,
    isDestructive?: boolean
  ) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.settingRow,
        { backgroundColor: colors.background, borderColor: colors.tabIconDefault },
      ]}>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.settingTitle,
            {
              color: isDestructive ? '#ff6b6b' : colors.text,
            },
          ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.tabIconDefault }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>
          Appearance
        </Text>
        
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          {(['light', 'dark', 'system'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setTheme(mode)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: state.themeMode === mode ? colors.tint : colors.tabIconDefault,
                backgroundColor: state.themeMode === mode ? colors.tint : 'transparent',
                alignItems: 'center',
              }}>
              <Text 
                style={{ 
                  color: state.themeMode === mode ? 'white' : colors.text, 
                  fontSize: 14, 
                  fontWeight: '600',
                  textTransform: 'capitalize' 
                }}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Data Management Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Data Management
        </Text>

        {renderSettingRow(
          'Export Data',
          'Backup all your tasks and sessions as JSON',
          handleExportData
        )}

        {renderSettingRow(
          'Clear All Data',
          'Permanently delete everything (cannot be undone)',
          handleClearData,
          true
        )}

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>

        <View style={[styles.settingRow, { backgroundColor: colors.background, borderColor: colors.tabIconDefault }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              App Version
            </Text>
            <Text style={[styles.settingSubtitle, { color: colors.tabIconDefault }]}>
              1.0.0
            </Text>
          </View>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.tint }]}>
          <Text style={styles.infoText}>
            📝 Productivity Tracker helps you:
          </Text>
          <Text style={styles.infoText}>
            • Track daily work hours per task
          </Text>
          <Text style={styles.infoText}>
            • Auto carry-over unfinished work
          </Text>
          <Text style={styles.infoText}>
            • Monitor progress and analytics
          </Text>
          <Text style={styles.infoText}>
            • Organize work with folders
          </Text>
        </View>

        {/* Tips Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tips</Text>

        <View style={[styles.tipsBox, { backgroundColor: colors.background, borderColor: colors.tabIconDefault }]}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>Daily Carry-Over</Text>
          <Text style={[styles.tipsText, { color: colors.tabIconDefault }]}>
            If you don't complete your daily target hours, the remaining hours automatically carry over to the next day.
          </Text>
        </View>

        <View style={[styles.tipsBox, { backgroundColor: colors.background, borderColor: colors.tabIconDefault }]}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>Timer System</Text>
          <Text style={[styles.tipsText, { color: colors.tabIconDefault }]}>
            You can switch tasks anytime. The previous timer will auto-stop and save the session.
          </Text>
        </View>

        <View style={[styles.tipsBox, { backgroundColor: colors.background, borderColor: colors.tabIconDefault }]}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>Offline First</Text>
          <Text style={[styles.tipsText, { color: colors.tabIconDefault }]}>
            All your data is stored locally on your device. Sessions persist even if the app closes.
          </Text>
        </View>
      </ScrollView>

      {/* Loading Modal */}
      <Modal visible={isExporting} transparent animationType="fade">
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingBox, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Preparing export...
            </Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  settingRow: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    lineHeight: 20,
  },
  tipsBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingBox: {
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
