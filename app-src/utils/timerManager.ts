/**
 * Timer manager
 * Handles timer operations: start, stop, resume
 */

import dayjs from 'dayjs';
import { Session, Task } from '../../app-src/types';

export interface TimerData {
  taskId: string;
  startTime: number;
  currentDuration: number; // in minutes, updated as time passes
}

export type TargetReachedCallback = (taskId: string) => void;

/**
 * Start a new timer session
 * Returns a session object (without endTime yet since it's still running)
 */
export function createActiveSession(taskId: string): Omit<Session, 'id' | 'endTime'> {
  const now = Date.now();
  const today = dayjs().format('YYYY-MM-DD');

  return {
    taskId,
    startTime: now,
    duration: 0, // will be updated as timer runs
    date: today,
    notes: '',
  };
}

/**
 * Calculate elapsed time in minutes from session start
 */
export function getElapsedMinutes(sessionStartTime: number): number {
  const now = Date.now();
  return Math.floor((now - sessionStartTime) / 1000 / 60);
}

/**
 * Calculate elapsed time in seconds from session start
 */
export function getElapsedSeconds(sessionStartTime: number): number {
  const now = Date.now();
  return Math.floor((now - sessionStartTime) / 1000);
}

/**
 * Stop a timer and create a complete session record
 * Returns the finished session ready to be saved
 */
export function stopTimer(
  sessionStartTime: number,
  taskId: string,
  notes: string = '',
  accumulatedSeconds: number = 0
): Session {
  const now = Date.now();
  const elapsedMs = now - sessionStartTime;
  // Use a more precise duration in seconds stored as fractional minutes to avoid data loss
  const totalSeconds = Math.floor(elapsedMs / 1000) + accumulatedSeconds;
  
  const durationMinutes = totalSeconds / 60; // Keep seconds precision as a decimal
  const today = dayjs().format('YYYY-MM-DD');

  return {
    id: generateSessionId(),
    taskId,
    startTime: sessionStartTime - (accumulatedSeconds * 1000), 
    endTime: now,
    duration: durationMinutes,
    date: today,
    notes,
  };
}

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Resume a session that was previously paused/saved
 * Used when restarting app with active timer
 */
export function resumeSession(previousSession: Session): Omit<Session, 'id' | 'endTime'> {
  const previousDuration = previousSession.duration * 60 * 1000; // convert back to ms
  const adjustedStartTime = Date.now() - previousDuration;

  return {
    taskId: previousSession.taskId,
    startTime: adjustedStartTime,
    duration: previousSession.duration,
    date: previousSession.date,
    notes: previousSession.notes,
  };
}

/**
 * Format seconds as MM:SS display
 */
export function formatTimerDisplay(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

/**
 * Format hours:minutes display
 */
export function formatHourMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Add a completed session to a task
 */
export function addSessionToTask(task: Task, session: Session): Task {
  if (!task.sessions) {
    task.sessions = [];
  }
  
  // High-precision arithmetic using seconds as the base unit
  const currentTotalSeconds = Math.round(task.totalCompletedHours * 3600);
  const currentTodaySeconds = Math.round(task.completedTodayHours * 3600);
  const sessionSeconds = Math.round(session.duration * 60);

  return {
    ...task,
    sessions: [...task.sessions, session],
    totalCompletedHours: (currentTotalSeconds + sessionSeconds) / 3600,
    completedTodayHours: (currentTodaySeconds + sessionSeconds) / 3600,
  };
}

/**
 * Get all sessions for a task from a specific date
 */
export function getTaskSessionsForDate(task: Task, date: string): Session[] {
  if (!task.sessions) {
    return [];
  }
  return task.sessions.filter((session: Session) => session.date === date);
}

/**
 * Calculate total hours from array of sessions
 */
export function calculateSessionsTotalHours(sessions: Session[]): number {
  const totalMinutes = sessions.reduce((sum, session) => sum + session.duration, 0);
  return Number((totalMinutes / 60).toFixed(2));
}

/**
 * Get daily summary for all tasks on a specific date
 */
export interface DailySummary {
  date: string;
  totalHours: number;
  taskHours: { [taskId: string]: number };
}

export function calculateDailySummary(tasks: Task[], date: string): DailySummary {
  const taskHours: { [taskId: string]: number } = {};
  let totalHours = 0;

  for (const task of tasks) {
    const dailySessions = getTaskSessionsForDate(task, date);
    const hours = calculateSessionsTotalHours(dailySessions);
    if (hours > 0) {
      taskHours[task.id] = hours;
      totalHours += hours;
    }
  }

  return {
    date,
    totalHours: Number(totalHours.toFixed(2)),
    taskHours,
  };
}
