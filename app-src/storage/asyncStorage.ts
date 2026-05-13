/**
 * AsyncStorage wrapper for persisting app data
 * Handles all storage operations (load, save, clear)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '../../app-src/types';

const STORAGE_KEY = '@productivity_tracker';
const memoryFallback = new Map<string, string>();
let warnedStorageUnavailable = false;

function isStorageUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Native module is null') || message.includes('cannot access legacy storage');
}

function warnStorageUnavailableOnce(): void {
  if (!warnedStorageUnavailable) {
    warnedStorageUnavailable = true;
    console.warn('AsyncStorage unavailable; using in-memory fallback for this session. Restart app after reinstall/rebuild.');
  }
}

async function getItemSafe(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    if (isStorageUnavailableError(error)) {
      warnStorageUnavailableOnce();
      return memoryFallback.get(key) ?? null;
    }
    throw error;
  }
}

async function setItemSafe(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
    memoryFallback.set(key, value);
  } catch (error) {
    if (isStorageUnavailableError(error)) {
      warnStorageUnavailableOnce();
      memoryFallback.set(key, value);
      return;
    }
    throw error;
  }
}

async function removeItemSafe(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    memoryFallback.delete(key);
  } catch (error) {
    if (isStorageUnavailableError(error)) {
      warnStorageUnavailableOnce();
      memoryFallback.delete(key);
      return;
    }
    throw error;
  }
}

async function getAllKeysSafe(): Promise<string[]> {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    if (isStorageUnavailableError(error)) {
      warnStorageUnavailableOnce();
      return Array.from(memoryFallback.keys());
    }
    throw error;
  }
}

/**
 * Load entire app state from storage
 * Returns default/empty state if nothing exists
 */
export async function loadAppState(): Promise<AppState> {
  try {
    const stored = await getItemSafe(STORAGE_KEY);
    if (!stored) {
      return getDefaultAppState();
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading app state:', error);
    return getDefaultAppState();
  }
}

/**
 * Save entire app state to storage
 */
export async function saveAppState(state: AppState): Promise<void> {
  try {
    await setItemSafe(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving app state:', error);
    // Don't throw - let app continue even if save fails
  }
}

/**
 * Clear all stored data
 */
export async function clearAllStorage(): Promise<void> {
  try {
    await removeItemSafe(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}

/**
 * Export app data as JSON string for backup
 */
export async function exportData(): Promise<string> {
  try {
    const state = await loadAppState();
    return JSON.stringify(state, null, 2);
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
}

/**
 * Import app data from JSON string
 */
export async function importData(jsonString: string): Promise<void> {
  try {
    const state = JSON.parse(jsonString) as AppState;
    await saveAppState(state);
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
}

/**
 * Get default empty app state
 */
export function getDefaultAppState(): AppState {
  const today = new Date().toISOString().split('T')[0];
  return {
    workspace: {
      id: 'workspace_1',
      name: 'My Work',
      children: [],
      createdAt: Date.now(),
      lastModified: Date.now(),
    },
    activeTimerTaskId: null,
    activeTimerStartTime: null,
    dailyTrackings: [],
    lastAccessDate: today,
    themeMode: 'system',
  };
}

/**
 * Get storage stats (for debugging)
 */
export async function getStorageInfo(): Promise<{ keys: string[]; size: string }> {
  try {
    const keys = await getAllKeysSafe();
    const stored = await getItemSafe(STORAGE_KEY);
    const size = stored ? `${(stored.length / 1024).toFixed(2)} KB` : '0 KB';
    return { keys, size };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { keys: [], size: 'unknown' };
  }
}
