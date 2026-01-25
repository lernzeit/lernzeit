import { useState, useCallback, useRef, useEffect } from 'react';

interface UseActiveTimerReturn {
  /** Total elapsed time in milliseconds (only while active) */
  elapsedTime: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Start or resume the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Reset the timer to 0 */
  reset: () => void;
  /** Get formatted time string */
  formattedTime: string;
}

/**
 * A timer that only counts time while active.
 * Pauses automatically when the user is not answering (e.g., viewing feedback).
 */
export const useActiveTimer = (): UseActiveTimerReturn => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;
    
    startTimeRef.current = Date.now();
    setIsRunning(true);
    
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const currentSession = Date.now() - startTimeRef.current;
        setElapsedTime(accumulatedTimeRef.current + currentSession);
      }
    }, 100); // Update every 100ms for smooth display
  }, [isRunning]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    
    // Save accumulated time
    if (startTimeRef.current) {
      accumulatedTimeRef.current += Date.now() - startTimeRef.current;
    }
    startTimeRef.current = null;
    setIsRunning(false);
    clearTimerInterval();
    setElapsedTime(accumulatedTimeRef.current);
  }, [isRunning, clearTimerInterval]);

  const reset = useCallback(() => {
    clearTimerInterval();
    startTimeRef.current = null;
    accumulatedTimeRef.current = 0;
    setElapsedTime(0);
    setIsRunning(false);
  }, [clearTimerInterval]);

  // Format time as MM:SS or just SS
  const formattedTime = (() => {
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  })();

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimerInterval();
  }, [clearTimerInterval]);

  return {
    elapsedTime,
    isRunning,
    start,
    pause,
    reset,
    formattedTime
  };
};
