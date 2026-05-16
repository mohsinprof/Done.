/**
 * General utility functions
 */

import dayjs from 'dayjs';
import { Task, Folder, Chapter, Workspace } from '../../app-src/types';

/**
 * Generate unique IDs
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Format minutes to human readable string
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format timestamp to readable date string
 */
export function formatDate(timestamp: number | string): string {
  if (typeof timestamp === 'string') {
    return timestamp; // Already formatted as YYYY-MM-DD
  }
  return dayjs(timestamp).format('YYYY-MM-DD');
}

/**
 * Format timestamp to readable datetime string
 */
export function formatDateTime(timestamp: number): string {
  return dayjs(timestamp).format('MMM D, YYYY HH:mm');
}

/**
 * Format timestamp to time only (HH:mm)
 */
export function formatTime(timestamp: number): string {
  return dayjs(timestamp).format('HH:mm');
}

/**
 * Get day of week from timestamp
 */
export function getDayOfWeek(timestamp: number): string {
  return dayjs(timestamp).format('dddd');
}

/**
 * Format hours to human readable string (avoiding 0.6666h)
 */
export function formatHours(hours: number): string {
  if (hours === undefined || hours === null || isNaN(hours)) return '0m';
  const totalSeconds = Math.round(hours * 3600);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    if (mins > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${hrs}h`;
  }
  if (mins > 0) {
    return `${mins}m`;
  }
  if (totalSeconds > 0) {
    return `${secs}s`;
  }
  return '0m';
}

/**
 * Create a new task
 */
export function createTask(
  name: string,
  dailyTargetHours: number,
  parentFolderId: string | null = null,
  totalChapters: number = 0,
  targetTotalHours: number = 0,
  totalDaysGoal: number | null = null,
  completionPriority: 'hours' | 'chapters' | 'days' | 'none' = 'hours',
  scheduledDate?: string,
  deadlineDate?: string
): Task {
  return {
    id: generateId('task'),
    name,
    parentFolderId,
    dailyTargetHours,
    targetTotalHours,
    totalDaysGoal: totalDaysGoal || 0,
    daysWorkedCount: 0,
    isLifetimeCompleted: false,
    remainingHours: 0,
    totalCompletedHours: 0,
    completedTodayHours: 0,
    createdAt: Date.now(),
    chapters: [],
    totalChapters,
    completedChaptersCount: 0,
    sessions: [],
    completionPriority,
    scheduledDate,
    deadlineDate,
    isPlanned: !!(scheduledDate || deadlineDate),
  };
}

/**
 * Create a new folder
 */
export function createFolder(name: string, parentFolderId: string | null = null): Folder {
  return {
    id: generateId('folder'),
    name,
    parentFolderId,
    children: [],
    createdAt: Date.now(),
  };
}

/**
 * Create a new chapter
 */
export function createChapter(taskId: string, name: string): Chapter {
  return {
    id: generateId('chapter'),
    taskId,
    name,
    status: 'not_started',
    notes: '',
  };
}

/**
 * Find item by ID in workspace (recursive)
 */
export function findItemById(workspace: Workspace, id: string): Task | Folder | null {
  function search(items: (Task | Folder)[]): Task | Folder | null {
    for (const item of items) {
      if (item.id === id) {
        return item;
      }
      if ('children' in item) {
        const found = search(item.children);
        if (found) return found;
      }
    }
    return null;
  }

  return search(workspace.children);
}

/**
 * Update task in workspace (recursively finds and updates)
 */
export function updateTaskInWorkspace(
  workspace: Workspace,
  taskId: string,
  updates: Partial<Task>
): Workspace {
  return {
    ...workspace,
    children: workspace.children.map((item: Task | Folder) => updateItemRecursive(item, taskId, updates)),
    lastModified: Date.now(),
  };
}

function updateItemRecursive(
  item: Task | Folder,
  taskId: string,
  updates: Partial<Task>
): Task | Folder {
  if ('chapters' in item && item.id === taskId) {
    // Found the task
    return { ...item, ...updates };
  }

  if ('children' in item) {
    // It's a folder, search recursively
    return {
      ...item,
      children: item.children.map((child: Task | Folder) => updateItemRecursive(child, taskId, updates)),
    };
  }

  return item;
}

/**
 * Delete item from workspace by ID
 */
export function deleteItemFromWorkspace(
  workspace: Workspace,
  id: string
): Workspace {
  return {
    ...workspace,
    children: deleteItemRecursive(workspace.children, id),
    lastModified: Date.now(),
  };
}

function deleteItemRecursive(items: (Task | Folder)[], id: string): (Task | Folder)[] {
  return items
    .filter(item => item.id !== id)
    .map(item => {
      if ('children' in item) {
        return {
          ...item,
          children: deleteItemRecursive(item.children, id),
        };
      }
      return item;
    });
}

/**
 * Calculate progress percentage (0-100)
 */
export function calculateProgressPercent(completed: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.round((completed / target) * 100));
}

/**
 * Check if task is overdue (remaining hours carried over)
 */
export function isTaskBehindSchedule(task: Task): boolean {
  return task.remainingHours > 0;
}

/**
 * Sort tasks by status (behind schedule first)
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Behind schedule tasks first
    if (isTaskBehindSchedule(a) && !isTaskBehindSchedule(b)) return -1;
    if (!isTaskBehindSchedule(a) && isTaskBehindSchedule(b)) return 1;

    // Then by lowest remaining hours (most urgent)
    return b.completedTodayHours - a.completedTodayHours;
  });
}
