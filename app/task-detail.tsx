import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTask } from '@/app-src/context/TaskContext';
import { Colors } from '@/../app-example/constants/theme';
import { useColorScheme } from '@/../app-example/hooks/use-color-scheme';
import { ProgressBar } from '@/app-src/components/ProgressBar';
import { SessionListItem } from '@/app-src/components/SessionListItem';
import { getTaskById, getTodayDate } from '@/app-src/utils/carryOverLogic';
import { getTaskSessionsForDate } from '@/app-src/utils/timerManager';
import { formatHours, formatDateTime } from '@/app-src/utils/helpers';

/**
 * Task Detail Screen - shows comprehensive task information
 */
export default function TaskDetailScreen() {
  const systemColorScheme = useColorScheme();
  const router = useRouter();
  const { taskId } = useLocalSearchParams();
  const { state, startTimer, updateTask, addChapter, updateChapterStatus, deleteItem, updateCompletedChapters, restartTask } =
    useTask();

  const colors = Colors[state.themeMode === 'system' ? (systemColorScheme ?? 'light') : state.themeMode];

  const [showAddChapter, setShowAddChapter] = useState(false);
  const [chapterName, setChapterName] = useState('');

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editType, setEditType] = useState<'name' | 'dailyTarget' | 'totalGoal' | 'chapters' | 'duration' | null>(null);
  const [editValue, setEditValue] = useState('');

  const task = useMemo(() => {
    if (!taskId) return null;
    const found = getTaskById(state.workspace, taskId as string);
    return found;
  }, [taskId, state.workspace]);

  const today = getTodayDate();
  const todaySessions = useMemo(() => {
    if (!task) return [];
    return getTaskSessionsForDate(task, today);
  }, [task, today]);

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Task not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.errorButton, { backgroundColor: colors.tint }]}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const todayTotal = todaySessions.reduce((sum, s) => sum + s.duration, 0);
  const todayHours = todayTotal / 60;

  const handleAddChapter = () => {
    if (!chapterName.trim()) {
      Alert.alert('Error', 'Chapter name is required');
      return;
    }
    addChapter(task.id, chapterName);
    setChapterName('');
    setShowAddChapter(false);
  };

  const handleDeleteTask = () => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.name}"? All sessions will be lost.`,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            deleteItem(task.id);
            router.back();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleEditTask = () => {
    setEditType('name');
    setEditValue(task.name);
    setIsEditModalVisible(true);
  };

  const handleEditDailyTarget = () => {
    setEditType('dailyTarget');
    setEditValue(task.dailyTargetHours.toString());
    setIsEditModalVisible(true);
  };

  const handleEditTotalGoal = () => {
    setEditType('totalGoal');
    setEditValue((task.targetTotalHours || 0).toString());
    setIsEditModalVisible(true);
  };

  const handleEditChaptersGoal = () => {
    setEditType('chapters');
    setEditValue((task.totalChapters || 0).toString());
    setIsEditModalVisible(true);
  };

  const handleDurationEdit = () => {
    setEditType('duration');
    setEditValue((task.autoDeleteConfig?.delayValue || 0).toString());
    setIsEditModalVisible(true);
  };

  const saveEdit = () => {
    if (!task) return;
    
    switch (editType) {
      case 'name':
        if (editValue.trim()) updateTask(task.id, { name: editValue.trim() });
        break;
      case 'dailyTarget':
        const hours = parseFloat(editValue || '0');
        if (hours > 0) updateTask(task.id, { dailyTargetHours: hours });
        break;
      case 'totalGoal':
        const goal = parseFloat(editValue || '0');
        updateTask(task.id, { 
          targetTotalHours: goal, 
          isLifetimeCompleted: goal > 0 ? task.totalCompletedHours >= goal : false 
        });
        break;
      case 'chapters':
        const chapters = parseInt(editValue || '0');
        updateTask(task.id, { totalChapters: chapters });
        break;
      case 'duration':
        const days = parseInt(editValue || '0');
        updateTask(task.id, { 
          autoDeleteConfig: { 
            enabled: days > 0, 
            delayType: 'days', 
            delayValue: days 
          } 
        });
        break;
    }
    setIsEditModalVisible(false);
    setEditType(null);
  };

  const handleRestartTask = () => {
    Alert.alert(
      'Restart Task',
      'This will reset all progress for this task. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', onPress: () => restartTask(task.id) }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Task Header Card */}
        <View style={[styles.headerCard, { backgroundColor: colors.tint }]}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskName}>{task.name}</Text>
            </View>
            <TouchableOpacity
              onPress={handleEditTask}
              style={styles.headerAction}>
              <Text style={styles.headerActionText}>✎</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatLabel}>Total</Text>
              <Text style={styles.headerStatValue}>
                {formatHours(task.totalCompletedHours)}
              </Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatLabel}>Today</Text>
              <Text style={styles.headerStatValue}>{formatHours(todayHours)}</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatLabel}>Remaining</Text>
              <Text style={styles.headerStatValue}>
                {formatHours(task.remainingHours)}
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Target Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Target</Text>
            <TouchableOpacity
              onPress={handleEditDailyTarget}
              style={[styles.sectionAction, { backgroundColor: colors.tint }]}>
              <Text style={styles.sectionActionText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.dailyTargetInfo, { color: colors.tabIconDefault }]}>
            {formatHours(task.dailyTargetHours)} per day
          </Text>

          <ProgressBar
            completed={task.completedTodayHours}
            target={task.dailyTargetHours}
            height={12}
          />
        </View>

        {/* Task Details Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Task Settings</Text>
          
          <View style={styles.settingsGrid}>
            <TouchableOpacity onPress={handleEditDailyTarget} style={styles.settingItem}>
              <Text style={styles.settingLabel}>Daily Target</Text>
              <Text style={[styles.settingValue, { color: colors.tint }]}>{formatHours(task.dailyTargetHours)}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleEditTotalGoal} style={styles.settingItem}>
              <Text style={styles.settingLabel}>Total Goal</Text>
              <Text style={[styles.settingValue, { color: colors.tint }]}>
                {task.targetTotalHours ? formatHours(task.targetTotalHours) : 'None'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleEditChaptersGoal} style={styles.settingItem}>
              <Text style={styles.settingLabel}>Chapters</Text>
              <Text style={[styles.settingValue, { color: colors.tint }]}>{task.totalChapters || 'None'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDurationEdit} style={styles.settingItem}>
              <Text style={styles.settingLabel}>Duration</Text>
              <Text style={[styles.settingValue, { color: colors.tint }]}>
                {task.autoDeleteConfig?.enabled ? `${task.autoDeleteConfig.delayValue} days` : 'None'}
              </Text>
            </TouchableOpacity>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Priority</Text>
              <Text style={[styles.settingValue, { color: colors.tint, textTransform: 'capitalize' }]}>
                {task.completionPriority || 'Hours'}
              </Text>
            </View>
          </View>
        </View>

        {/* Chapter Progress Section */}
        {(task.totalChapters || 0) > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Chapter Progress</Text>
            <View style={[styles.chapterProgressCard, { backgroundColor: colors.background, borderColor: colors.tabIconDefault }]}>
              <TouchableOpacity 
                onPress={() => updateCompletedChapters(task.id, false)}
                style={styles.countButton}>
                <Text style={{ fontSize: 24, color: colors.tint }}>-</Text>
              </TouchableOpacity>
              
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.chapterCount, { color: colors.text }]}>
                  {task.completedChaptersCount || 0} / {task.totalChapters || 0}
                </Text>
                <Text style={{ fontSize: 12, color: colors.tabIconDefault }}>Chapters Completed</Text>
              </View>

              <TouchableOpacity 
                onPress={() => updateCompletedChapters(task.id, true)}
                style={styles.countButton}>
                <Text style={{ fontSize: 24, color: colors.tint }}>+</Text>
              </TouchableOpacity>
            </View>
            
            {task.autoDeleteConfig?.enabled && task.completedChaptersCount === task.totalChapters && task.totalChapters! > 0 && (
              <View style={styles.deletionNotice}>
                <Text style={{ color: '#ff6b6b', fontSize: 12, fontWeight: 'bold' }}>
                  Scheduled for deletion in {task.autoDeleteConfig.delayValue} {task.autoDeleteConfig.delayType}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Chapters Section */}
        {task.chapters && task.chapters.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Chapters ({task.chapters.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddChapter(true)}
                style={[styles.sectionAction, { backgroundColor: colors.tint }]}>
                <Text style={styles.sectionActionText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              {task.chapters.map((chapter) => (
                <View
                  key={chapter.id}
                  style={[
                    styles.chapterItem,
                    { backgroundColor: colors.background, borderColor: colors.tabIconDefault },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.chapterName, { color: colors.text }]}>
                      {chapter.name}
                    </Text>
                    {chapter.notes && (
                      <Text style={[styles.chapterNotes, { color: colors.tabIconDefault }]}>
                        {chapter.notes}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      const nextStatus =
                        chapter.status === 'not_started'
                          ? 'in_progress'
                          : chapter.status === 'in_progress'
                            ? 'done'
                            : 'not_started';
                      updateChapterStatus(task.id, chapter.id, nextStatus);
                    }}
                    style={[
                      styles.chapterStatus,
                      {
                        backgroundColor:
                          chapter.status === 'done'
                            ? '#4CAF50'
                            : chapter.status === 'in_progress'
                              ? '#FFC107'
                              : colors.tabIconDefault,
                      },
                    ]}>
                    <Text style={styles.chapterStatusText}>
                      {chapter.status === 'done' ? '✓' : chapter.status === 'in_progress' ? '◐' : '○'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Add Chapter Button */}
        <TouchableOpacity
          onPress={() => setShowAddChapter(true)}
          style={[styles.addChapterButton, { borderColor: colors.tint }]}>
          <Text style={[styles.addChapterButtonText, { color: colors.tint }]}>
            + Add Chapter
          </Text>
        </TouchableOpacity>

        {/* Today's Sessions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Today's Sessions ({todaySessions.length})
          </Text>

          {todaySessions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              No sessions recorded today
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {todaySessions.map((session) => (
                <SessionListItem key={session.id} session={session} />
              ))}
            </View>
          )}
        </View>

        {/* All Sessions History */}
        {task.sessions && task.sessions.length > todaySessions.length && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              All Sessions ({task.sessions.length})
            </Text>

            <View style={{ gap: 8, maxHeight: 300 }}>
              {task.sessions.slice(-10).map((session) => (
                <SessionListItem key={session.id} session={session} />
              ))}
            </View>

            {task.sessions.length > 10 && (
              <Text
                style={[
                  styles.moreSessionsText,
                  { color: colors.tabIconDefault },
                ]}>
                ... and {task.sessions.length - 10} more sessions
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            onPress={() => startTimer(task.id)}
            style={[styles.actionButton, { backgroundColor: colors.tint }]}>
            <Text style={styles.actionButtonText}>Start Timer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteTask}
            style={[styles.actionButton, styles.deleteButton]}>
            <Text style={styles.deleteButtonText}>Delete Task</Text>
          </TouchableOpacity>
        </View>
        {/* Danger Zone */}
        <View style={[styles.section, { borderTopWidth: 1, borderTopColor: '#ff6b6b33', marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: '#ff6b6b' }]}>Danger Zone</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              onPress={handleRestartTask}
              style={[styles.dangerButton, { backgroundColor: colors.tint, flex: 1 }]}>
              <Text style={styles.dangerButtonText}>Restart Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteTask}
              style={[styles.dangerButton, { backgroundColor: '#ff6b6b', flex: 1 }]}>
              <Text style={styles.dangerButtonText}>Delete Forever</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Add Chapter Modal */}
      <Modal
        visible={showAddChapter}
        animationType="slide"
        onRequestClose={() => setShowAddChapter(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Chapter</Text>
            <TouchableOpacity onPress={() => setShowAddChapter(false)}>
              <Text style={[styles.closeButton, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.modalLabel, { color: colors.text }]}>Chapter Name</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.tabIconDefault,
                  color: colors.text,
                  borderColor: colors.tint,
                },
              ]}
              placeholder="e.g., Chapter 1, Week 1"
              placeholderTextColor={colors.tabIconDefault}
              value={chapterName}
              onChangeText={setChapterName}
            />

            <TouchableOpacity
              onPress={handleAddChapter}
              style={[styles.modalButton, { backgroundColor: colors.tint }]}>
              <Text style={styles.modalButtonText}>Add Chapter</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Generic Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.compactModal, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 15 }]}>
              {editType === 'name' ? 'Edit Task Name' :
               editType === 'dailyTarget' ? 'Daily Target (Hours)' :
               editType === 'totalGoal' ? 'Total Hours Goal (0 for Single Use)' :
               editType === 'chapters' ? 'Total Chapters (0 for Single Use)' :
               editType === 'duration' ? 'Duration (Days, 0 for Single Use)' : 'Edit'}
            </Text>
            
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: 'rgba(150, 150, 150, 0.1)',
                  color: colors.text,
                  borderColor: colors.tint,
                  borderWidth: 1,
                  minWidth: 250
                },
              ]}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType={editType === 'name' ? 'default' : 'numeric'}
              autoFocus={true}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                style={[styles.modalButton, { backgroundColor: colors.tabIconDefault, flex: 1 }]}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveEdit}
                style={[styles.modalButton, { backgroundColor: colors.tint, flex: 1 }]}>
                <Text style={styles.modalButtonText}>Save</Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  headerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskName: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  headerAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  headerActionText: {
    fontSize: 18,
    color: 'white',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  headerStat: {
    alignItems: 'center',
  },
  headerStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  section: {
    marginBottom: 20,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sectionActionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  dailyTargetInfo: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  addChapterButton: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  addChapterButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  chapterItem: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chapterName: {
    fontSize: 14,
    fontWeight: '500',
  },
  chapterNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  chapterStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterStatusText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  moreSessionsText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  settingItem: {
    width: '48%',
    padding: 12,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  settingLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  dangerButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  actionSection: {
    gap: 8,
    marginTop: 20,
    marginBottom: 32,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
  chapterProgressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  countButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterCount: {
    fontSize: 24,
    fontWeight: '700',
  },
  deletionNotice: {
    marginTop: 8,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  compactModal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
