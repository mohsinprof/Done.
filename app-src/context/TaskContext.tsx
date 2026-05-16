/**
 * Task Context - Global state management for the app
 * Manages: workspace, timer state, daily tracking
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { Task, Folder, Session, Chapter, Workspace, AppState } from '../../app-src/types';
import {
  loadAppState,
  saveAppState,
  getDefaultAppState,
  clearAllStorage,
  exportData,
  importData,
} from '../../app-src/storage/asyncStorage';
import {
  executeDailyCarryOver,
  shouldExecuteCarryOver,
  getTodayDate,
  getAllTasksFlat,
  getTaskById,
  calculateTodayTotalHours,
} from '../../app-src/utils/carryOverLogic';
import {
  getElapsedMinutes,
  getElapsedSeconds,
  stopTimer,
  addSessionToTask,
  createActiveSession,
  generateSessionId,
} from '../../app-src/utils/timerManager';
import {
  generateId,
  createTask,
  createFolder,
  createChapter,
  updateTaskInWorkspace,
  deleteItemFromWorkspace,
  findItemById,
} from '../../app-src/utils/helpers';

// Action types
type Action =
  | { type: 'INIT'; payload: AppState }
  | { type: 'EXECUTE_CARRY_OVER'; payload: AppState }
  | { type: 'START_TIMER'; payload: string } // taskId
  | { type: 'STOP_TIMER'; payload: { notes?: string } }
  | { type: 'ADD_TASK'; payload: { name: string; dailyTargetHours: number; parentFolderId: string | null; totalChapters?: number; targetTotalHours?: number; daysToComplete?: number | null; completionPriority: 'hours' | 'chapters' | 'days' | 'none'; scheduledDate?: string; deadlineDate?: string } }
  | { type: 'ADD_FOLDER'; payload: { name: string; parentFolderId: string | null } }
  | { type: 'DELETE_ITEM'; payload: string } // id
  | { type: 'DELETE_COMPLETED_TASKS' }
  | { type: 'UPDATE_TASK'; payload: { taskId: string; updates: Partial<Task> } }
  | { type: 'ADD_CHAPTER'; payload: { taskId: string; chapterName: string } }
  | { type: 'UPDATE_CHAPTER'; payload: { taskId: string; chapterId: string; status: 'not_started' | 'in_progress' | 'done' } }
  | { type: 'UPDATE_CHAPTER_COUNT'; payload: { taskId: string; increment: boolean } }
  | { type: 'RESTART_TASK'; payload: string } // taskId
  | { type: 'SET_AUTO_DELETE'; payload: { taskId: string; config: Task['autoDeleteConfig'] } }
  | { type: 'PAUSE_TIMER' }
  | { type: 'CLEAR_DATA' }
  | { type: 'IMPORT_DATA'; payload: AppState }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' };

interface TaskContextType {
  state: AppState;
  // Timer actions
  startTimer: (taskId: string) => void;
  stopTimer: (notes?: string) => void;
  pauseTimer: () => void;
  restartTask: (taskId: string) => void;
  getActiveTaskName: () => string | null;
  getElapsedSeconds: () => number;
  
  // Task management actions
  addTask: (name: string, dailyTargetHours: number, parentFolderId?: string | null, totalChapters?: number, targetTotalHours?: number, daysToComplete?: number | null, completionPriority?: 'hours' | 'chapters' | 'days' | 'none', scheduledDate?: string) => void;
  addFolder: (name: string, parentFolderId?: string | null) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteItem: (id: string) => void;
  deleteCompletedTasks: () => void;
  
  // Chapter actions
  addChapter: (taskId: string, chapterName: string) => void;
  updateChapterStatus: (taskId: string, chapterId: string, status: 'not_started' | 'in_progress' | 'done') => void;
  updateCompletedChapters: (taskId: string, increment: boolean) => void;
  
  // Data actions
  clearAllData: () => Promise<void>;
  exportAppData: () => Promise<string>;
  importAppData: (jsonString: string) => Promise<void>;
  setTheme: (mode: 'light' | 'dark' | 'system') => void;
  
  // Helper getters
  getTodayTotalHours: () => number;
  getTodayTotalSeconds: () => number;
  getTaskTodaySeconds: (task: Task) => number;
  getTaskTotalSeconds: (task: Task) => number;
  getTaskById: (taskId: string) => Task | null;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

function taskReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT': {
      return action.payload;
    }

    case 'EXECUTE_CARRY_OVER': {
      return action.payload;
    }

    case 'START_TIMER': {
      const taskId = action.payload;
      const now = Date.now();
      
      // If there's an active timer already, stop it first to save progress
      let currentState = state;
      if (state.activeTimerTaskId && state.activeTimerStartTime) {
        currentState = taskReducer(state, { type: 'STOP_TIMER', payload: {} });
      }

      const task = getTaskById(currentState.workspace, taskId);
      console.log(`[TaskContext] START_TIMER: task=${task?.name}, accumulated=${task?.currentSessionElapsedSeconds || 0}s`);

      const nextState = {
        ...currentState,
        activeTimerTaskId: taskId,
        activeTimerStartTime: now, // Correct: ALWAYS start fresh from "now"
      };

      // Crash Protection: Persist immediately
      saveAppState(nextState).catch(e => console.error('Failed to persist START_TIMER', e));

      return nextState;
    }

    case 'STOP_TIMER': {
      // If no active timer, ignore
      if (!state.activeTimerTaskId || !state.activeTimerStartTime) {
        return state;
      }

      const liveElapsedSeconds = Math.floor((Date.now() - state.activeTimerStartTime) / 1000);
      const today = getTodayDate();

      // Find task and add session
      let updatedWorkspace = state.workspace;
      const task = getTaskById(updatedWorkspace, state.activeTimerTaskId);
      
      const session = stopTimer(
        state.activeTimerStartTime, 
        state.activeTimerTaskId, 
        action.payload.notes,
        task?.currentSessionElapsedSeconds || 0
      );

      if (task) {
        // Clear task-level accumulated time since we're finishing the session
        let updatedTask = {
          ...addSessionToTask(task, session),
          currentSessionElapsedSeconds: 0,
        };

        const dailyTargetTotalSec = Math.round((updatedTask.dailyTargetHours + updatedTask.remainingHours) * 3600);
        const completedTodaySec = Math.round(updatedTask.completedTodayHours * 3600);

        // Check for lifetime completion based on priority
        if (updatedTask.completionPriority === 'hours') {
          const targetSeconds = Math.round((updatedTask.targetTotalHours || 0) * 3600);
          const completedTotalSeconds = Math.round(updatedTask.totalCompletedHours * 3600);
          
          if (targetSeconds > 0 && completedTotalSeconds >= targetSeconds) {
            updatedTask.isLifetimeCompleted = true;
            console.log(`[TaskContext] Lifetime Goal (Hours) Reached: ${completedTotalSeconds}s / ${targetSeconds}s`);
          }
        } else if (updatedTask.completionPriority === 'chapters') {
          if (updatedTask.totalChapters && updatedTask.totalChapters > 0 && (updatedTask.completedChaptersCount || 0) >= updatedTask.totalChapters) {
            updatedTask.isLifetimeCompleted = true;
            console.log(`[TaskContext] Lifetime Goal (Chapters) Reached`);
          }
        } else if (updatedTask.completionPriority === 'days') {
          // Note: daysWorkedCount is incremented in carryOver, but for UI/Logic 
          // we are checking if the goal will be met after carry-over.
          const targetDays = updatedTask.totalDaysGoal || 0;
          const finishedDays = updatedTask.daysWorkedCount || 0;
          const isTodayFinished = completedTodaySec >= dailyTargetTotalSec;

          if (targetDays > 0 && (finishedDays + (isTodayFinished ? 1 : 0)) >= targetDays) {
            updatedTask.isLifetimeCompleted = true;
            console.log(`[TaskContext] Lifetime Goal (Days) Reached (Today completes the goal)`);
          }
        } else if (updatedTask.completionPriority === 'none') {
          // Priority 'none' (One-time): Automatically becomes lifetime completed when the single daily goal is met.
          if (completedTodaySec >= dailyTargetTotalSec) {
            updatedTask.isLifetimeCompleted = true;
            console.log(`[TaskContext] Lifetime Goal (None/One-time) Reached`);
          }
        }
        
        updatedWorkspace = updateTaskInWorkspace(updatedWorkspace, state.activeTimerTaskId, updatedTask);
      }

      const nextState = {
        ...state,
        workspace: updatedWorkspace,
        activeTimerTaskId: null,
        activeTimerStartTime: null,
      };

      // Crash Protection: Persist immediately
      saveAppState(nextState).catch(e => console.error('Failed to persist STOP_TIMER', e));

      return nextState;
    }

    case 'PAUSE_TIMER': {
      if (!state.activeTimerTaskId || !state.activeTimerStartTime) {
        return state;
      }

      const elapsedSeconds = Math.floor((Date.now() - state.activeTimerStartTime) / 1000);
      let updatedWorkspace = state.workspace;
      const task = getTaskById(updatedWorkspace, state.activeTimerTaskId);
      
      if (task) {
        // totalElapsed is now the total seconds accumulated for this session so far
        const totalElapsed = (task.currentSessionElapsedSeconds || 0) + elapsedSeconds;
        
        let updatedTask = {
          ...task,
          currentSessionElapsedSeconds: totalElapsed,
        };

        // Recalculate today's and total progress for real-time UI updates
        // Note: we don't save a session yet because it's just paused.
        // But the UI needs to know the task is "closer" to completion.
        
        updatedWorkspace = updateTaskInWorkspace(updatedWorkspace, state.activeTimerTaskId, updatedTask);
      }

      const nextState = {
        ...state,
        activeTimerTaskId: null,
        activeTimerStartTime: null,
        workspace: updatedWorkspace,
      };

      // Crash Protection: Persist immediately
      saveAppState(nextState).catch(e => console.error('Failed to persist PAUSE_TIMER', e));

      return nextState;
    }

    case 'ADD_TASK': {
      let { daysToComplete, scheduledDate, deadlineDate, completionPriority } = action.payload;

      // Handle 'Days' priority auto-range logic
      if (completionPriority === 'days' && daysToComplete && daysToComplete > 0) {
        const start = scheduledDate || getTodayDate();
        scheduledDate = start;
        deadlineDate = dayjs(start).add(daysToComplete - 1, 'day').format('YYYY-MM-DD');
      }

      const newTask = createTask(
        action.payload.name, 
        action.payload.dailyTargetHours, 
        action.payload.parentFolderId,
        action.payload.totalChapters || 0,
        action.payload.targetTotalHours || 0,
        daysToComplete || null,
        completionPriority || 'hours',
        scheduledDate,
        deadlineDate
      );
      return {
        ...state,
        workspace: addTaskToWorkspace(state.workspace, newTask, action.payload.parentFolderId),
      };
    }

    case 'DELETE_COMPLETED_TASKS': {
      const filterOutCompleted = (items: (Task | Folder)[]): (Task | Folder)[] => {
        return items.filter(item => {
          if ('children' in item) {
            item.children = filterOutCompleted(item.children as (Task | Folder)[]) as any;
            return true;
          }
          return !item.isLifetimeCompleted;
        });
      };
      return {
        ...state,
        workspace: {
          ...state.workspace,
          children: filterOutCompleted([...state.workspace.children]),
        },
      };
    }

    case 'RESTART_TASK': {
      const task = getTaskById(state.workspace, action.payload);
      if (!task) return state;

      const nextState = {
        ...state,
        workspace: updateTaskInWorkspace(state.workspace, action.payload, {
          isLifetimeCompleted: false,
          totalCompletedHours: 0,
          completedTodayHours: 0,
          remainingHours: 0,
          completedChaptersCount: 0,
          daysWorkedCount: 0,
          sessions: []
        }),
      };

      // Crash Protection
      saveAppState(nextState).catch(e => console.error('Failed to persist RESTART_TASK', e));

      return nextState;
    }

    case 'UPDATE_CHAPTER_COUNT': {
      const { taskId, increment } = action.payload;
      const task = getTaskById(state.workspace, taskId);
      if (!task) return state;

      const current = task.completedChaptersCount || 0;
      const total = task.totalChapters || 0;
      
      const next = increment 
        ? (total > 0 ? Math.min(total, current + 1) : current + 1) 
        : Math.max(0, current - 1);
      
      let updates: Partial<Task> = { completedChaptersCount: next };

      console.log(`[TaskContext] UPDATE_CHAPTER_COUNT: ${task.name}`);
      console.log(`[TaskContext] Current: ${current}, Next: ${next}, Total: ${total}`);

      // Handle Lifetime Completion via Chapters
      if (increment && task.completionPriority === 'chapters' && total > 0 && next === total) {
        console.log(`[TaskContext] Lifetime Goal (Chapters) Reached via Manual Increment`);
        updates.isLifetimeCompleted = true;
      }

      // Handle Priority 'none' (One-time) completion via manual increment if they use chapters for it
      if (increment && task.completionPriority === 'none' && next > 0) {
        console.log(`[TaskContext] Lifetime Goal (None/One-time) Reached via Manual Increment`);
        updates.isLifetimeCompleted = true;
      }

      // Auto-delete logic
      if (next === total && total > 0 && task.autoDeleteConfig?.enabled) {
        let ms = 0;
        const val = task.autoDeleteConfig.delayValue;
        if (task.autoDeleteConfig.delayType === 'minutes') ms = val * 60 * 1000;
        else if (task.autoDeleteConfig.delayType === 'hours') ms = val * 60 * 60 * 1000;
        else if (task.autoDeleteConfig.delayType === 'days') ms = val * 24 * 60 * 60 * 1000;
        
        updates.autoDeleteConfig = {
          ...task.autoDeleteConfig,
          deletionTimestamp: Date.now() + ms
        };
      }

      const nextState = {
        ...state,
        workspace: updateTaskInWorkspace(state.workspace, taskId, updates),
      };

      // Crash Protection
      saveAppState(nextState).catch(e => console.error('Failed to persist UPDATE_CHAPTER_COUNT', e));

      return nextState;
    }

    case 'SET_AUTO_DELETE': {
      return {
        ...state,
        workspace: updateTaskInWorkspace(state.workspace, action.payload.taskId, {
          autoDeleteConfig: action.payload.config
        }),
      };
    }

    case 'ADD_FOLDER': {
      const newFolder = createFolder(action.payload.name, action.payload.parentFolderId);
      return {
        ...state,
        workspace: addFolderToWorkspace(state.workspace, newFolder, action.payload.parentFolderId),
      };
    }

    case 'DELETE_ITEM': {
      return {
        ...state,
        workspace: deleteItemFromWorkspace(state.workspace, action.payload),
      };
    }

    case 'UPDATE_TASK': {
      const nextState = {
        ...state,
        workspace: updateTaskInWorkspace(state.workspace, action.payload.taskId, action.payload.updates),
      };
      
      // Crash Protection
      saveAppState(nextState).catch(e => console.error('Failed to persist UPDATE_TASK', e));
      
      return nextState;
    }

    case 'ADD_CHAPTER': {
      const chapter = createChapter(action.payload.taskId, action.payload.chapterName);
      return {
        ...state,
        workspace: addChapterToTask(state.workspace, action.payload.taskId, chapter),
      };
    }

    case 'UPDATE_CHAPTER': {
      return {
        ...state,
        workspace: updateChapterInTask(
          state.workspace,
          action.payload.taskId,
          action.payload.chapterId,
          action.payload.status
        ),
      };
    }

    case 'CLEAR_DATA': {
      return getDefaultAppState();
    }

    case 'IMPORT_DATA': {
      return action.payload;
    }

    case 'SET_THEME': {
      return {
        ...state,
        themeMode: action.payload,
      };
    }

    default:
      return state;
  }
}

/**
 * Helper: Add task to workspace tree
 */
function addTaskToWorkspace(workspace: Workspace, task: Task, parentId: string | null): Workspace {
  if (!parentId) {
    // Top-level
    return {
      ...workspace,
      children: [...workspace.children, task],
      lastModified: Date.now(),
    };
  }

  // Find parent and add
  return {
    ...workspace,
    children: workspace.children.map((item: Task | Folder) => addTaskToItem(item, task, parentId)),
    lastModified: Date.now(),
  };
}

function addTaskToItem(item: Task | Folder, task: Task, parentId: string): Task | Folder {
  if (item.id === parentId && 'children' in item) {
    return {
      ...item,
      children: [...item.children, task],
    };
  }

  if ('children' in item) {
    return {
      ...item,
      children: item.children.map((child: Task | Folder) => addTaskToItem(child, task, parentId)),
    };
  }

  return item;
}

/**
 * Helper: Add folder to workspace tree
 */
function addFolderToWorkspace(workspace: Workspace, folder: Folder, parentId: string | null): Workspace {
  if (!parentId) {
    return {
      ...workspace,
      children: [...workspace.children, folder],
      lastModified: Date.now(),
    };
  }

  return {
    ...workspace,
    children: workspace.children.map((item: Task | Folder) => addFolderToItem(item, folder, parentId)),
    lastModified: Date.now(),
  };
}

function addFolderToItem(item: Task | Folder, folder: Folder, parentId: string): Task | Folder {
  if (item.id === parentId && 'children' in item) {
    return {
      ...item,
      children: [...item.children, folder],
    };
  }

  if ('children' in item) {
    return {
      ...item,
      children: item.children.map((child: Task | Folder) => addFolderToItem(child, folder, parentId)),
    };
  }

  return item;
}

/**
 * Helper: Add chapter to task
 */
function addChapterToTask(workspace: Workspace, taskId: string, chapter: Chapter): Workspace {
  return {
    ...workspace,
    children: workspace.children.map((item: Task | Folder) => addChapterToItem(item, taskId, chapter)),
    lastModified: Date.now(),
  };
}

function addChapterToItem(item: Task | Folder, taskId: string, chapter: Chapter): Task | Folder {
  if ('chapters' in item && item.id === taskId) {
    return {
      ...item,
      chapters: [...(item.chapters || []), chapter],
    };
  }

  if ('children' in item) {
    return {
      ...item,
      children: item.children.map((child: Task | Folder) => addChapterToItem(child, taskId, chapter)),
    };
  }

  return item;
}

/**
 * Helper: Update chapter status in task
 */
function updateChapterInTask(
  workspace: Workspace,
  taskId: string,
  chapterId: string,
  status: 'not_started' | 'in_progress' | 'done'
): Workspace {
  return {
    ...workspace,
    children: workspace.children.map((item: Task | Folder) =>
      updateChapterInItem(item, taskId, chapterId, status)
    ),
    lastModified: Date.now(),
  };
}

function updateChapterInItem(
  item: Task | Folder,
  taskId: string,
  chapterId: string,
  status: 'not_started' | 'in_progress' | 'done'
): Task | Folder {
  if ('chapters' in item && item.id === taskId) {
    return {
      ...item,
      chapters: item.chapters?.map((ch: Chapter) => (ch.id === chapterId ? { ...ch, status } : ch)),
    };
  }

  if ('children' in item) {
    return {
      ...item,
      children: item.children.map((child: Task | Folder) =>
        updateChapterInItem(child, taskId, chapterId, status)
      ),
    };
  }

  return item;
}

// Provider component
export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, getDefaultAppState());
  const [isInitialized, setIsInitialized] = useState(false);

  // Auto-stop timer if target reached
  useEffect(() => {
    if (!state.activeTimerTaskId || !state.activeTimerStartTime) return;

    const interval = setInterval(() => {
      const task = getTaskById(state.workspace, state.activeTimerTaskId!);
      if (!task) return;

      const now = Date.now();
      const elapsedSeconds = Math.floor((now - state.activeTimerStartTime!) / 1000) + (task.currentSessionElapsedSeconds || 0);
      
      const dailyTargetSeconds = Math.round(task.dailyTargetHours * 3600);
      const remainingHoursSeconds = Math.round(task.remainingHours * 3600);
      const targetSeconds = dailyTargetSeconds + remainingHoursSeconds;
      
      const completedTodaySeconds = Math.round(task.completedTodayHours * 3600);

      if (completedTodaySeconds + elapsedSeconds >= targetSeconds) {
        dispatch({ type: 'STOP_TIMER', payload: { notes: 'Auto-stopped: Daily target reached' } });
        clearInterval(interval);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [state.activeTimerTaskId, state.activeTimerStartTime, state.workspace]);

  // Initialize from storage on mount
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        const savedState = await loadAppState();
        const today = getTodayDate();

        // Execute carry-over if day has changed
        let finalState = savedState;
        if (shouldExecuteCarryOver(savedState.lastAccessDate, today)) {
          finalState = executeDailyCarryOver(savedState, today);
          await saveAppState(finalState);
        }

        if (isMounted) {
          dispatch({ type: 'INIT', payload: finalState });
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize app state:', error);
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  // Persist state to storage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;

    async function persist() {
      try {
        await saveAppState(state);
      } catch (error) {
        console.error('Failed to persist state:', error);
      }
    }

    persist();
  }, [state, isInitialized]);

  // Action handlers
  const startTimer = useCallback((taskId: string) => {
    dispatch({ type: 'START_TIMER', payload: taskId });
  }, []);

  const stopTimer = useCallback((notes?: string) => {
    dispatch({ type: 'STOP_TIMER', payload: { notes } });
  }, []);

  const pauseTimer = useCallback(() => {
    dispatch({ type: 'PAUSE_TIMER' });
  }, []);

  const restartTask = useCallback((taskId: string) => {
    dispatch({ type: 'RESTART_TASK', payload: taskId });
  }, []);

  const addTask = useCallback(
    (
      name: string,
      dailyTargetHours: number,
      parentFolderId: string | null = null,
      totalChapters: number = 0,
      targetTotalHours: number = 0,
      daysToComplete: number | null = null,
      completionPriority: 'hours' | 'chapters' | 'days' | 'none' = 'hours',
      scheduledDate?: string
    ) => {
      dispatch({
        type: 'ADD_TASK',
        payload: {
          name,
          dailyTargetHours,
          parentFolderId,
          totalChapters,
          targetTotalHours,
          daysToComplete,
          completionPriority,
          scheduledDate,
        },
      });
    },
    []
  );

  const deleteCompletedTasks = useCallback(() => {
    dispatch({ type: 'DELETE_COMPLETED_TASKS' });
  }, []);

  const addFolder = useCallback(
    (name: string, parentFolderId: string | null = null) => {
      dispatch({
        type: 'ADD_FOLDER',
        payload: { name, parentFolderId },
      });
    },
    []
  );

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: { taskId, updates },
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ITEM', payload: id });
  }, []);

  const addChapter = useCallback((taskId: string, chapterName: string) => {
    dispatch({
      type: 'ADD_CHAPTER',
      payload: { taskId, chapterName },
    });
  }, []);

  const updateChapterStatus = useCallback(
    (taskId: string, chapterId: string, status: 'not_started' | 'in_progress' | 'done') => {
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { taskId, chapterId, status },
      });
    },
    []
  );

  const updateCompletedChapters = useCallback((taskId: string, increment: boolean) => {
    dispatch({ type: 'UPDATE_CHAPTER_COUNT', payload: { taskId, increment } });
  }, []);

  const clearAllData = useCallback(async () => {
    dispatch({ type: 'CLEAR_DATA' });
    await clearAllStorage();
  }, []);

  const exportAppData = useCallback(async () => {
    return exportData();
  }, []);

  const importAppData = useCallback(async (jsonString: string) => {
    const importedState = JSON.parse(jsonString) as AppState;
    dispatch({ type: 'IMPORT_DATA', payload: importedState });
    await saveAppState(importedState);
  }, []);

  const setTheme = useCallback((mode: 'light' | 'dark' | 'system') => {
    dispatch({ type: 'SET_THEME', payload: mode });
  }, []);

  const getActiveTaskName = useCallback(() => {
    if (!state.activeTimerTaskId) return null;
    const task = getTaskById(state.workspace, state.activeTimerTaskId);
    return task?.name || null;
  }, [state]);

  const getElapsedSecondsValue = useCallback(() => {
    if (!state.activeTimerStartTime || !state.activeTimerTaskId) return 0;
    
    const task = getTaskById(state.workspace, state.activeTimerTaskId);
    const accumulated = task?.currentSessionElapsedSeconds || 0;
    const current = Math.floor((Date.now() - state.activeTimerStartTime) / 1000);
    return accumulated + current;
  }, [state]);

  const getTodayTotalHoursValue = useCallback(() => {
    const dailyTotal = calculateTodayTotalHours(state, getTodayDate());
    // Add current session's work (paused and active)
    const allTasks = getAllTasksFlat(state.workspace);
    const accumulated = allTasks.reduce((sum, t) => sum + (t.currentSessionElapsedSeconds || 0), 0);
    const live = state.activeTimerStartTime ? Math.floor((Date.now() - state.activeTimerStartTime) / 1000) : 0;
    return dailyTotal + ((accumulated + live) / 3600);
  }, [state]);

  const getTodayTotalSeconds = useCallback(() => {
    const dailyTotalHours = calculateTodayTotalHours(state, getTodayDate());
    const dailyTotalSeconds = Math.round(dailyTotalHours * 3600);
    const allTasks = getAllTasksFlat(state.workspace);
    const accumulated = allTasks.reduce((sum, t) => sum + (t.currentSessionElapsedSeconds || 0), 0);
    const live = state.activeTimerStartTime ? Math.floor((Date.now() - state.activeTimerStartTime) / 1000) : 0;
    return dailyTotalSeconds + accumulated + live;
  }, [state]);

  const getTaskTodaySeconds = useCallback((task: Task) => {
    const isThisActive = state.activeTimerTaskId === task.id;
    const live = isThisActive && state.activeTimerStartTime ? Math.floor((Date.now() - state.activeTimerStartTime) / 1000) : 0;
    const accumulated = task.currentSessionElapsedSeconds || 0;
    return Math.round(task.completedTodayHours * 3600) + accumulated + live;
  }, [state.activeTimerTaskId, state.activeTimerStartTime]);

  const getTaskTotalSeconds = useCallback((task: Task) => {
    const isThisActive = state.activeTimerTaskId === task.id;
    const live = isThisActive && state.activeTimerStartTime ? Math.floor((Date.now() - state.activeTimerStartTime) / 1000) : 0;
    const accumulated = task.currentSessionElapsedSeconds || 0;
    return Math.round(task.totalCompletedHours * 3600) + accumulated + live;
  }, [state.activeTimerTaskId, state.activeTimerStartTime]);

  const value: TaskContextType = {
    state,
    startTimer,
    stopTimer,
    pauseTimer,
    restartTask,
    getActiveTaskName,
    getElapsedSeconds: getElapsedSecondsValue,
    addTask,
    addFolder,
    updateTask,
    deleteItem,
    deleteCompletedTasks,
    addChapter,
    updateChapterStatus,
    updateCompletedChapters,
    clearAllData,
    exportAppData,
    importAppData,
    setTheme,
    getTodayTotalHours: getTodayTotalHoursValue,
    getTodayTotalSeconds,
    getTaskTodaySeconds,
    getTaskTotalSeconds,
    getTaskById: (taskId: string) => getTaskById(state.workspace, taskId),
  };

  if (!isInitialized) {
    return null; // Don't render until initialized
  }

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

// Hook to use the context
export function useTask(): TaskContextType {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within TaskProvider');
  }
  return context;
}
