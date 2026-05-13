/**
 * Daily carry-over logic
 * Handles task hour carry-over at end of day
 */

import dayjs from 'dayjs';
import { AppState, Task, Folder, Workspace, Session } from '@/app-src/types';

/**
 * Execute daily carry-over logic
 * Runs once per day when app detects date change
 * 
 * For each task:
 * - If completedTodayHours < dailyTargetHours:
 *   - Calculate remaining: dailyTarget - completedToday
 *   - Add remaining to next day's remainingHours (cumulative)
 * - Reset completedTodayHours to 0 for new day
 * - Keep totalCompletedHours (lifetime)
 * - Preserve all sessions (never delete history)
 */
export function executeDailyCarryOver(state: AppState, today: string): AppState {
  const yesterday = dayjs(today).subtract(1, 'day').format('YYYY-MM-DD');
  const lastAccess = state.lastAccessDate;

  // Perform scheduled deletions
  const now = Date.now();
  let cleanWorkspace = performScheduledDeletions(state.workspace, now);

  // Only run carry-over if day has changed
  if (lastAccess === today) {
    return {
      ...state,
      workspace: cleanWorkspace,
    };
  }

  console.log('Executing daily carry-over from', lastAccess, 'to', today);

  // Process all tasks recursively
  const updatedWorkspace = carryOverWorkspace(cleanWorkspace, today);

  return {
    ...state,
    workspace: updatedWorkspace,
    activeTimerTaskId: null, // Reset active timer on day change
    activeTimerStartTime: null,
    lastAccessDate: today,
  };
}

/**
 * Delete tasks whose scheduled deletion time has passed
 */
function performScheduledDeletions(workspace: Workspace, now: number): Workspace {
  function traverseAndFilter(items: (Folder | Task)[]): (Folder | Task)[] {
    return items.filter(item => {
      if ('autoDeleteConfig' in item && item.autoDeleteConfig?.deletionTimestamp) {
        return now < item.autoDeleteConfig.deletionTimestamp;
      }
      return true;
    }).map(item => {
      if ('children' in item) {
        return {
          ...item,
          children: traverseAndFilter(item.children)
        };
      }
      return item;
    });
  }

  return {
    ...workspace,
    children: traverseAndFilter(workspace.children),
    lastModified: Date.now()
  };
}

/**
 * Recursively process workspace children
 */
function carryOverWorkspace(workspace: Workspace, today: string): Workspace {
  return {
    ...workspace,
    children: workspace.children.map(child => carryOverChild(child, today)),
    lastModified: Date.now(),
  };
}

/**
 * Handle both folders and tasks
 */
function carryOverChild(child: Folder | Task, today: string): Folder | Task {
  if ('children' in child) {
    // It's a folder
    return {
      ...child,
      children: child.children.map(subChild => carryOverChild(subChild, today)),
    };
  } else {
    // It's a task
    return carryOverTask(child, today);
  }
}

/**
 * Apply carry-over logic to a single task
 */
function carryOverTask(task: Task, today: string): Task {
  const { dailyTargetHours, completedTodayHours, remainingHours } = task;

  // Calculate unfinished hours from today
  const unfinishedToday = dailyTargetHours - completedTodayHours;
  
  // Hours to carry forward (only if positive)
  const hoursToCarry = Math.max(0, unfinishedToday);

  // New remaining hours = hours carried from today + any already remaining
  const newRemainingHours = remainingHours + hoursToCarry;

  return {
    ...task,
    remainingHours: newRemainingHours,
    completedTodayHours: 0, // Reset daily counter
    // totalCompletedHours and sessions are NEVER changed
  };
}

/**
 * Check if carry-over needs to execute
 * Returns true if app was opened on a different day than last access
 */
export function shouldExecuteCarryOver(lastAccessDate: string, today: string): boolean {
  return lastAccessDate !== today;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return dayjs().format('YYYY-MM-DD');
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
export function getYesterdayDate(): string {
  return dayjs().subtract(1, 'day').format('YYYY-MM-DD');
}

/**
 * Calculate total hours worked today across all tasks
 */
export function calculateTodayTotalHours(state: AppState, today: string): number {
  const todaySessions = getAllSessions(state.workspace).filter(
    session => session.date === today
  );
  const totalMinutes = todaySessions.reduce((sum, session) => sum + session.duration, 0);
  return Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimals
}

/**
 * Get all sessions from workspace recursively
 */
function getAllSessions(workspace: Workspace): Session[] {
  const sessions: Session[] = [];

  function traverse(children: (Folder | Task)[]): void {
    if (!children) return;
    
    for (const child of children) {
      if ('children' in child) {
        // Folder
        traverse(child.children);
      } else {
        // Task
        if (child.sessions) {
          sessions.push(...child.sessions);
        }
      }
    }
  }

  traverse(workspace.children);
  return sessions;
}

/**
 * Find all tasks as flat list (recursive)
 */
export function getAllTasksFlat(workspace: Workspace): Task[] {
  const tasks: Task[] = [];

  function traverse(children: (Folder | Task)[]): void {
    if (!children) return;
    
    for (const child of children) {
      if ('children' in child) {
        // Folder
        traverse(child.children);
      } else {
        // Task
        tasks.push(child);
      }
    }
  }

  traverse(workspace.children);
  return tasks;
}

/**
 * Get task by ID (recursive search)
 */
export function getTaskById(workspace: Workspace, taskId: string): Task | null {
  for (const task of getAllTasksFlat(workspace)) {
    if (task.id === taskId) {
      return task;
    }
  }
  return null;
}
