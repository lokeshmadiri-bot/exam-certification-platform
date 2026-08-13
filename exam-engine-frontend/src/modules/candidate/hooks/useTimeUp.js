import { useState, useEffect, useRef, useCallback } from 'react';
import { examSyncService } from '../services/examSyncService';

export function useTimeUp({ attemptId, initialSeconds, answers, active, onAutoSubmit }) {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds || 0);
  const [submitting, setSubmitting] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const autoSubmittedRef = useRef(false);

  // Sync initial seconds when loaded
  useEffect(() => {
    if (typeof initialSeconds === 'number') {
      setRemainingSeconds(initialSeconds);
    }
  }, [initialSeconds]);

  const handleTimeUp = useCallback(async () => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;

    setIsTimeUp(true);
    setSubmitting(true);

    try {
      // 1. Flush last state & unsaved answers
      if (attemptId && answers) {
        await examSyncService.syncAnswers(attemptId, answers, 0).catch(() => {});
      }
    } catch (err) {
      console.error('Error flushing answers on time-up:', err);
    }

    // 2. Trigger submission callback
    if (onAutoSubmit) {
      await onAutoSubmit();
    }
  }, [attemptId, answers, onAutoSubmit]);

  useEffect(() => {
    if (!active || submitting || isTimeUp) return;

    if (remainingSeconds <= 0 && initialSeconds > 0) {
      handleTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [active, submitting, isTimeUp, remainingSeconds, initialSeconds, handleTimeUp]);

  const formatTime = (secs) => {
    if (secs < 0) secs = 0;
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return {
    remainingSeconds,
    setRemainingSeconds,
    submitting,
    isTimeUp,
    formattedTime: formatTime(remainingSeconds),
    formatTime
  };
}
