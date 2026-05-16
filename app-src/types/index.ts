/**
 * Core type definitions for the Productivity Tracker app
 */

/** Session represents a single time-tracking log */
export interface Session {
  id: string;
  taskId: string;
  startTime: number; // timestamp
  endTime: number | null; // null if still active
  duration: number; // in minutes
  notes?: string;
  date: string; // YYYY-MM-DD format for easy querying
}

/** Chapter represents an optional sub-level inside a task (for books, courses, etc) */
export interface Chapter {
  id: string;
  taskId: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'done';
  notes?: string;
}

/** Task is a main work unit */
export interface Task {
  id: string;
  name: string;
  parentFolderId: string | null; // null if top-level
  dailyTargetHours: number; // hours per day
  targetTotalHours?: number; // lifetime target hours (e.g., 100 hours of exercise)
  totalDaysGoal?: number; // total days to work on this task
  daysWorkedCount?: number; // count of days where daily target was met
  isLifetimeCompleted?: boolean; // if targetTotalHours reached
  remainingHours: number; // hours left for today (carried over from yesterday)
  totalCompletedHours: number; // lifetime total
  completedTodayHours: number; // today's progress toward dailyTargetHours
  createdAt: number;
  chapters?: Chapter[];
  totalChapters?: number;
  completedChaptersCount?: number;
  sessions?: Session[]; // all historical sessions for this task
  currentSessionElapsedSeconds?: number; // accumulated time for current unfinished session
  completionPriority: 'hours' | 'chapters' | 'days' | 'none'; // Priority for lifetime completion
  scheduledDate?: string; // YYYY-MM-DD for one-off planned tasks
  deadlineDate?: string; // YYYY-MM-DD for explicit end date
  isPlanned?: boolean; // toggle for scheduled/planned tasks
  autoDeleteConfig?: {
    enabled: boolean;
    delayType: 'minutes' | 'hours' | 'days';
    delayValue: number;
    deletionTimestamp?: number; // when it should be deleted
  };
}

/** Folder can contain both folders and tasks */
export interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null; // null if top-level
  children: (Folder | Task)[]; // mixed array
  createdAt: number;
}

/** Workspace is the root container */
export interface Workspace {
  id: string;
  name: string;
  children: (Folder | Task)[]; // top-level items
  createdAt: number;
  lastModified: number;
}

/** Daily tracking metadata */
export interface DailyTracking {
  date: string; // YYYY-MM-DD
  totalHours: number; // sum of all completed hours this day
  taskIds: string[]; // tasks worked on this day
  lastAccessDate?: string; // last date app was opened
}

/** Root application state */
export interface AppState {
  workspace: Workspace;
  activeTimerTaskId: string | null;
  activeTimerStartTime: number | null;
  dailyTrackings: DailyTracking[];
  lastAccessDate: string; // YYYY-MM-DD format
  themeMode: 'light' | 'dark' | 'system';
}

/** Timer state for real-time display */
export interface TimerState {
  isRunning: boolean;
  taskId: string | null;
  elapsedSeconds: number;
  currentSessionStartTime: number | null;
}
