import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTask } from '@/app-src/context/TaskContext';
import { Colors } from '@/../app-example/constants/theme';
import { useColorScheme } from '@/../app-example/hooks/use-color-scheme';
import { FolderItem } from '@/app-src/components/FolderItem';
import { getAllTasksFlat } from '@/app-src/utils/carryOverLogic';
import { formatHours } from '@/app-src/utils/helpers';

/**
 * Folders Screen - displays folder tree and task hierarchy
 */
export default function FoldersScreen() {
  const systemColorScheme = useColorScheme();
  const colorScheme = systemColorScheme ?? 'light';
  const { state, addTask, addFolder, deleteItem, deleteCompletedTasks } = useTask();
  
  const colors = Colors[(state.themeMode === 'system' ? (systemColorScheme ?? 'light') : state.themeMode) as 'light' | 'dark'];

  const [modalType, setModalType] = useState<'task' | 'folder' | null>(null);
  const [itemName, setItemName] = useState('');
  const [dailyHours, setDailyHours] = useState('2');
  const [dailyMinutes, setDailyMinutes] = useState('0');
  const [totalHoursGoal, setTotalHoursGoal] = useState('0');
  const [daysGoal, setDaysGoal] = useState('');
  const [totalChapters, setTotalChapters] = useState('0');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);

  const flatTasks = useMemo(() => getAllTasksFlat(state.workspace), [state.workspace]);
  const completedTasks = useMemo(() => flatTasks.filter(t => t.isLifetimeCompleted), [flatTasks]);

  const handleAddTaskModal = (parentId: string | null = null) => {
    setSelectedParentId(parentId);
    setModalType('task');
    setItemName('');
    setDailyHours('2');
    setDailyMinutes('0');
    setTotalHoursGoal('0');
    setDaysGoal('');
    setTotalChapters('0');
  };

  const handleAddFolderModal = (parentId: string | null = null) => {
    setSelectedParentId(parentId);
    setModalType('folder');
    setItemName('');
  };

  const handleConfirm = () => {
    if (!itemName.trim()) {
      Alert.alert('Error', `${modalType === 'task' ? 'Task' : 'Folder'} name is required`);
      return;
    }

    if (modalType === 'task') {
      const hours = parseFloat(dailyHours) || 0;
      const minutes = parseFloat(dailyMinutes) || 0;
      const totalDaily = hours + (minutes / 60);

      if (totalDaily <= 0) {
        Alert.alert('Error', 'Daily target must be greater than zero');
        return;
      }
      
      const totalGoal = parseFloat(totalHoursGoal) || 0;
      const days = parseInt(daysGoal) || null;
      addTask(itemName, totalDaily, selectedParentId, parseInt(totalChapters) || 0, totalGoal, days);
    } else {
      addFolder(itemName, selectedParentId);
    }

    setModalType(null);
    setItemName('');
    setDailyHours('2');
    setDailyMinutes('0');
    setTotalHoursGoal('0');
    setDaysGoal('');
    setTotalChapters('0');
    setSelectedParentId(null);
  };

  const handleBulkDeleteCompleted = () => {
    Alert.alert(
      'Bulk Delete',
      `Are you sure you want to delete all ${completedTasks.length} completed tasks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: deleteCompletedTasks }
      ]
    );
  };

  const renderRootItems = ({ item }: { item: any }) => {
    if ('children' in item) {
      return (
        <FolderItem
          folder={item}
          onAddTask={handleAddTaskModal}
          onAddFolder={handleAddFolderModal}
        />
      );
    } else {
      // Task at root level
      return (
        <TouchableOpacity
          style={[
            styles.taskItem,
            {
              backgroundColor: colors.background,
              borderColor: colors.tabIconDefault,
            },
          ]}>
          <Text style={[styles.taskText, { color: item.isLifetimeCompleted ? colors.tabIconDefault : colors.text, textDecorationLine: item.isLifetimeCompleted ? 'line-through' : 'none' }]}>
            {item.name} {item.isLifetimeCompleted ? '(Done)' : ''}
          </Text>
          <Text style={[styles.taskHours, { color: colors.tabIconDefault }]}>
            {formatHours(item.dailyTargetHours)}
          </Text>
        </TouchableOpacity>
      );
    }
  };

  const filteredWorkspaceData = useMemo(() => {
    console.log(`[Folders] Recalculating Filtered View. ShowCompletedOnly: ${showCompletedOnly}`);
    if (!showCompletedOnly) return state.workspace.children;
    
    // Improved filtering for folders: show folders only if they contain completed tasks
    const filterItems = (items: any[]): any[] => {
      const results: any[] = [];
      
      for (const item of items) {
        if ('children' in item) {
          // Folder: check children recursively
          const filteredChildren = filterItems(item.children);
          if (filteredChildren.length > 0) {
            results.push({ ...item, children: filteredChildren });
          }
        } else if (item.isLifetimeCompleted) {
          // Task: check if completed
          console.log(`[Folders] Found completed task: ${item.name}`);
          results.push(item);
        }
      }
      return results;
    };

    const result = filterItems(state.workspace.children);
    console.log(`[Folders] Completed tasks found: ${result.length}`);
    return result;
  }, [state.workspace, showCompletedOnly]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Workspace Hierarchy</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => handleAddTaskModal(null)}
              style={[styles.headerButton, { backgroundColor: colors.tint }]}>
              <Text style={styles.headerButtonText}>+ Task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAddFolderModal(null)}
              style={styles.headerButton}>
              <Text style={[styles.headerButtonText, { color: colors.tint }]}>+ Folder</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filteredWorkspaceData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.tabIconDefault }]}>
                {showCompletedOnly ? 'No completed tasks found.' : 'No items yet. Create a task or folder!'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredWorkspaceData}
              keyExtractor={(item) => item.id}
              renderItem={renderRootItems}
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      </View>

      {/* Management Tools Section (Bottom Half) */}
      <View style={[styles.bottomSection, { borderTopColor: colors.tabIconDefault, backgroundColor: colorScheme === 'dark' ? '#273469' : '#F1F5F9' }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Management Tools</Text>
        
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.background }]}
            onPress={() => setShowCompletedOnly(!showCompletedOnly)}
          >
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              {showCompletedOnly ? 'Show All Tasks' : 'Filter Completed'}
            </Text>
            <Text style={[styles.actionValue, { color: colors.tint }]}>
              {completedTasks.length} Done
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.background }]}
            onPress={handleBulkDeleteCompleted}
            disabled={completedTasks.length === 0}
          >
            <Text style={[styles.actionLabel, { color: '#ff6b6b' }]}>Bulk Delete</Text>
            <Text style={[styles.actionSub, { color: colors.tabIconDefault }]}>Completed Tasks</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Workspace Folders</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {state.workspace.children.filter(c => 'children' in c).length}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Active Tasks</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{flatTasks.length}</Text>
          </View>
        </View>
      </View>

      {/* Add Modal */}
      <Modal visible={modalType !== null} animationType="slide" onRequestClose={() => setModalType(null)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add {modalType === 'task' ? 'Task' : 'Folder'}
            </Text>
            <TouchableOpacity onPress={() => setModalType(null)}>
              <Text style={[styles.closeButton, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {modalType === 'task' ? 'Task' : 'Folder'} Name
            </Text>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  backgroundColor: colors.tabIconDefault + '20',
                  color: colors.text,
                  borderColor: colors.tint,
                },
              ]}
              placeholder={modalType === 'task' ? 'e.g., Study' : 'e.g., Projects'}
              placeholderTextColor={colors.tabIconDefault}
              value={itemName}
              onChangeText={setItemName}
            />

            {modalType === 'task' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Daily Target</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        {
                          backgroundColor: colors.tabIconDefault + '20',
                          color: colors.text,
                          borderColor: colors.tint,
                        },
                      ]}
                      placeholder="Hours"
                      placeholderTextColor={colors.tabIconDefault}
                      value={dailyHours}
                      onChangeText={setDailyHours}
                      keyboardType="decimal-pad"
                    />
                    <Text style={{ fontSize: 10, color: colors.text, marginTop: -15, marginBottom: 10 }}>Hours</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        {
                          backgroundColor: colors.tabIconDefault + '20',
                          color: colors.text,
                          borderColor: colors.tint,
                        },
                      ]}
                      placeholder="Minutes"
                      placeholderTextColor={colors.tabIconDefault}
                      value={dailyMinutes}
                      onChangeText={setDailyMinutes}
                      keyboardType="decimal-pad"
                    />
                    <Text style={{ fontSize: 10, color: colors.text, marginTop: -15, marginBottom: 10 }}>Minutes</Text>
                  </View>
                </View>

                <Text style={[styles.fieldLabel, { color: colors.text }]}>Lifetime Goal (Total Hours)</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.tabIconDefault + '20', color: colors.text, borderColor: colors.tint }]}
                  value={totalHoursGoal}
                  onChangeText={setTotalHoursGoal}
                  keyboardType="numeric"
                  placeholder="e.g., 100 (0 for Single Use)"
                />

                <Text style={[styles.fieldLabel, { color: colors.text }]}>Chapters Count</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.tabIconDefault + '20', color: colors.text, borderColor: colors.tint }]}
                  value={totalChapters}
                  onChangeText={setTotalChapters}
                  keyboardType="numeric"
                  placeholder="e.g., 20 (0 for Single Use)"
                />

                <Text style={[styles.fieldLabel, { color: colors.text }]}>Auto-Delete Duration (Days)</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.tabIconDefault + '20', color: colors.text, borderColor: colors.tint }]}
                  value={daysGoal}
                  onChangeText={setDaysGoal}
                  keyboardType="numeric"
                  placeholder="e.g., 5 (0 for Single Use)"
                />
              </>
            )}

            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.confirmButton, { backgroundColor: colors.tint }]}>
              <Text style={styles.confirmButtonText}>
                Create {modalType === 'task' ? 'Task' : 'Folder'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  headerButtonText: {
    fontWeight: '600',
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  taskText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  taskHours: {
    fontSize: 12,
    fontWeight: '600',
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
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 20,
    fontSize: 14,
  },
  confirmButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomSection: {
    flex: 1,
    padding: 20,
    borderTopWidth: 1,
    gap: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 5,
  },
  infoBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(150,150,150,0.05)',
  },
  infoLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});
