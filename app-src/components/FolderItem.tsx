import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Folder, Task } from '@/app-src/types';
import { Colors } from '@/../app-example/constants/theme';
import { useColorScheme } from '@/../app-example/hooks/use-color-scheme';
import { IconSymbol } from '@/../app-example/components/ui/icon-symbol';
import { formatHours } from '@/app-src/utils/helpers';

interface FolderItemProps {
  folder: Folder;
  level?: number;
  onFolderPress?: (folderId: string) => void;
  onTaskPress?: (taskId: string) => void;
  onAddTask?: (parentFolderId: string) => void;
  onAddFolder?: (parentFolderId: string) => void;
}

/**
 * Folder tree item - displays folder with expand/collapse and children
 */
export function FolderItem({
  folder,
  level = 0,
  onFolderPress,
  onTaskPress,
  onAddTask,
  onAddFolder,
}: FolderItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isExpanded, setIsExpanded] = useState(false);

  const hasChildren = folder.children && folder.children.length > 0;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onFolderPress?.(folder.id);
  };

  const renderChild = ({
    item,
  }: {
    item: Folder | Task;
  }) => {
    if ('children' in item) {
      return (
        <FolderItem
          folder={item}
          level={level + 1}
          onFolderPress={onFolderPress}
          onTaskPress={onTaskPress}
          onAddTask={onAddTask}
          onAddFolder={onAddFolder}
        />
      );
    } else {
      return (
        <TouchableOpacity
          onPress={() => onTaskPress?.(item.id)}
          style={[
            styles.taskItem,
            {
              marginLeft: (level + 2) * 16,
              backgroundColor: colors.background,
              borderColor: colors.tabIconDefault,
            },
          ]}>
          <IconSymbol name="list.bullet" size={16} color={item.isLifetimeCompleted ? colors.tabIconDefault : colors.tint} />
          <Text style={[styles.taskText, { 
            color: item.isLifetimeCompleted ? colors.tabIconDefault : colors.text,
            textDecorationLine: item.isLifetimeCompleted ? 'line-through' : 'none'
          }]}>
            {item.name} {item.isLifetimeCompleted ? '✓' : ''}
          </Text>
          <Text style={[styles.taskHours, { color: colors.tabIconDefault }]}>
            {formatHours(item.dailyTargetHours)}
          </Text>
        </TouchableOpacity>
      );
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={handleToggle}
        style={[
          styles.folderItem,
          {
            marginLeft: level * 16,
            backgroundColor: colors.background,
            borderColor: colors.tabIconDefault,
          },
        ]}>
        <IconSymbol
          name="folder.fill"
          size={20}
          color={colors.tint}
        />
        <Text style={[styles.folderText, { color: colors.text }]}>
          {folder.name}
        </Text>
        {hasChildren && (
          <Text style={[styles.childCount, { color: colors.tabIconDefault }]}>
            {folder.children!.length}
          </Text>
        )}
      </TouchableOpacity>

      {isExpanded && hasChildren && (
        <FlatList
          data={folder.children}
          keyExtractor={(item) => item.id}
          renderItem={renderChild}
          scrollEnabled={false}
        />
      )}

      {isExpanded && (
        <View style={{ marginLeft: (level + 1) * 16, marginTop: 8, gap: 8 }}>
          <TouchableOpacity
            onPress={() => onAddTask?.(folder.id)}
            style={[
              styles.actionButton,
              { backgroundColor: colors.tint },
            ]}>
            <Text style={styles.actionButtonText}>+ Add Task</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onAddFolder?.(folder.id)}
            style={[
              styles.actionButton,
              { borderColor: colors.tint, borderWidth: 1 },
            ]}>
            <Text style={[styles.actionButtonText, { color: colors.tint }]}>
              + Add Folder
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
    gap: 8,
  },
  folderText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  childCount: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
    gap: 8,
  },
  taskText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
  },
  taskHours: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 12,
    color: 'white',
  },
});
