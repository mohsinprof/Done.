import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { useTask } from '../../app-src/context/TaskContext';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { getAllTasksFlat } from '../../app-src/utils/carryOverLogic';
import { Task } from '../../app-src/types';
import { formatMinutes } from '../../app-src/utils/helpers';

interface TimerModalProps {
  visible: boolean;
  taskId?: string | null;
  onClose: () => void;
}

/**
 * Timer Modal - floating timer with start/stop controls
 */
export function TimerModal({ visible, taskId, onClose }: TimerModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { state, stopTimer, startTimer, getActiveTaskName, getTaskById: getTaskByIdFromContext, pauseTimer } = useTask();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(taskId || null);

  // Update available tasks list
  useEffect(() => {
    const tasks = getAllTasksFlat(state.workspace);
    setAllTasks(tasks);
  }, [state.workspace]);

  // If taskId prop changes, update selected task
  useEffect(() => {
    if (taskId) {
      setSelectedTaskId(taskId);
      if (state.activeTimerTaskId !== taskId) {
        startTimer(taskId);
      }
    }
  }, [taskId, startTimer, state.activeTimerTaskId]);

  // Use a derived piece of state to track if we're "technically" active even when paused
  const isTechnicallyActive = !!state.activeTimerTaskId || (taskId && getTaskByIdFromContext(taskId)?.currentSessionElapsedSeconds! > 0);

  // Live timer update
  useEffect(() => {
    if (!visible) {
      setElapsedSeconds(0);
      return;
    }

    // If active, run interval. If paused, just set to the accumulated time once.
    if (state.activeTimerStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        // live elapsed reflects ONLY the current segment
        const liveSegmentSeconds = Math.floor((now - state.activeTimerStartTime!) / 1000);
        
        const currentTask = state.activeTimerTaskId ? getTaskByIdFromContext(state.activeTimerTaskId) : null;
        const accumulated = currentTask?.currentSessionElapsedSeconds || 0;
        
        setElapsedSeconds(liveSegmentSeconds + accumulated);
      }, 1000);
    } else {
      const currentTask = taskId ? getTaskByIdFromContext(taskId) : null;
      setElapsedSeconds(currentTask?.currentSessionElapsedSeconds || 0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, state.activeTimerStartTime, state.activeTimerTaskId, taskId]);

  const formatTimerDisplay = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStopTimer = () => {
    if (showNotesInput) {
      stopTimer(sessionNotes);
      setSessionNotes('');
      setShowNotesInput(false);
      setTimeout(() => onClose(), 300);
    } else {
      setShowNotesInput(true);
    }
  };

  const handleSwitchTask = (newTaskId: string) => {
    // Current task
    const oldTaskId = state.activeTimerTaskId;
    
    // Stop current timer (this handles persistence and cleanup)
    if (oldTaskId) {
      stopTimer('');
    }
    
    // Update selected ID and start new timer
    setSelectedTaskId(newTaskId);
    startTimer(newTaskId);
  };

  const activeTaskName = getActiveTaskName();
  const currentTask = allTasks.find((t) => t.id === selectedTaskId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        {/* Modal Content */}
        {!state.activeTimerTaskId ? (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}>
              <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
            <View style={styles.timerContent}>
              <Text style={[styles.taskNameDisplay, { color: colors.text }]}>Paused</Text>
              <Text style={[styles.timerDisplay, { color: colors.text }]}>
                {formatTimerDisplay(elapsedSeconds || (selectedTaskId ? (getTaskByIdFromContext(selectedTaskId)?.currentSessionElapsedSeconds || 0) : 0))}
              </Text>
            </View>
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.tint }]}
                onPress={() => selectedTaskId && startTimer(selectedTaskId)}>
                <Text style={styles.buttonText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={handleStopTimer}>
                <Text style={styles.buttonText}>Stop & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.modal, { backgroundColor: '#4CAF50' }]}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {/* Timer Display */}
            <View style={styles.timerContent}>
              <Text style={styles.taskNameDisplay}>{activeTaskName}</Text>
              <Text style={styles.timerDisplay}>{formatTimerDisplay(elapsedSeconds)}</Text>
              <Text style={styles.durationDisplay}>
                {formatMinutes(Math.floor(elapsedSeconds / 60))}
              </Text>
            </View>

            {/* Notes Input (shown before stopping) */}
            {showNotesInput && (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Add notes (optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="What did you work on?"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={sessionNotes}
                  onChangeText={setSessionNotes}
                  multiline
                />
              </View>
            )}

            {/* Task Picker */}
            <View style={styles.taskPickerSection}>
              <Text style={styles.taskPickerLabel}>Or switch task:</Text>
              <View style={styles.taskPickerContainer}>
                {allTasks.slice(0, 3).map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => handleSwitchTask(task.id)}
                    style={[
                      styles.taskPickerButton,
                      selectedTaskId === task.id && styles.taskPickerButtonActive,
                    ]}>
                    <Text
                      style={[
                        styles.taskPickerButtonText,
                        selectedTaskId === task.id && styles.taskPickerButtonTextActive,
                      ]}>
                      {task.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Control Buttons */}
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => pauseTimer()}>
                <Text style={styles.buttonText}>Pause</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={handleStopTimer}>
                <Text style={styles.buttonText}>
                  {showNotesInput ? 'Save & Stop' : 'Stop'}
                </Text>
              </TouchableOpacity>

              {showNotesInput && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowNotesInput(false)}>
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 32,
    gap: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: '300',
  },
  timerContent: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  taskNameDisplay: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: '700',
    color: 'white',
    fontVariant: ['tabular-nums'],
  },
  durationDisplay: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  notesSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginVertical: 8,
  },
  notesLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 60,
  },
  taskPickerSection: {
    marginVertical: 8,
  },
  taskPickerLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  taskPickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  taskPickerButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  taskPickerButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 2,
    borderColor: 'white',
  },
  taskPickerButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  taskPickerButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
