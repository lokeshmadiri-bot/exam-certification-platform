import { useState, useEffect, useRef, useCallback } from 'react';
import { useExam } from '../context/ExamContext';
import { examSyncService } from '../services/examSyncService';

export function useTimeUp({ attemptId, answers, active, onAutoSubmit }) {
  const {
    beginnerTimeRemaining,
    intermediateTimeRemaining,
    advancedTimeRemaining,
    loading,
    offline
  } = useExam();

  const totalRemaining = beginnerTimeRemaining !== null && intermediateTimeRemaining !== null && advancedTimeRemaining !== null
    ? (beginnerTimeRemaining + intermediateTimeRemaining + advancedTimeRemaining)
    : null;

  const [submitting, setSubmitting] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const autoSubmittedRef = useRef(false);

  const handleTimeUp = useCallback(async () => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;

    setIsTimeUp(true);
    setSubmitting(true);

    try {
      // Flush last state & unsaved answers
      if (attemptId && answers) {
        await examSyncService.syncAnswers(
          attemptId,
          answers,
          0,
          0,
          0,
          0
        ).catch(() => {});
      }
    } catch (err) {
      console.error('Error flushing answers on time-up:', err);
    }

    // Trigger submission callback
    if (onAutoSubmit) {
      await onAutoSubmit();
    }
  }, [attemptId, answers, onAutoSubmit]);

  useEffect(() => {
    if (!active || submitting || isTimeUp || totalRemaining === null) return;

    if (totalRemaining <= 0) {
      handleTimeUp();
    }
  }, [active, submitting, isTimeUp, totalRemaining, handleTimeUp]);

  return {
    remainingSeconds: totalRemaining || 0,
    submitting,
    isTimeUp
  };
}
