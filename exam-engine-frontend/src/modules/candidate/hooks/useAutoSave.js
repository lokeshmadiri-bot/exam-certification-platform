import { useEffect, useRef } from 'react';
import { useExam } from '../context/ExamContext';
import { storage } from '../utils/storage';
import { examService } from '../services/examService';

export function useAutoSave() {
  const {
    answers,
    setAnswers,
    attemptId,
    saving,
    setSaving,
    beginnerTimeRemaining,
    intermediateTimeRemaining,
    advancedTimeRemaining
  } = useExam();
  const retryTimeoutRef = useRef(null);

  const getOptionId = (option) => {
    const map = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
    return map[option] || null;
  };

  // Sync any pending items in the queue
  const processQueue = async () => {
    if (!attemptId) return;

    const queue = storage.get(`queue_${attemptId}`, {});
    const pendingQuestions = Object.keys(queue);
    
    if (pendingQuestions.length === 0) {
      setSaving('Saved');
      return;
    }

    setSaving('Saving...');
    let allSucceeded = true;

    for (const qId of pendingQuestions) {
      const option = queue[qId];
      const optId = getOptionId(option);

      try {
        await examService.saveAnswer(
          attemptId,
          qId,
          option,
          optId,
          beginnerTimeRemaining,
          intermediateTimeRemaining,
          advancedTimeRemaining
        );
        
        // Remove from queue on success
        const currentQueue = storage.get(`queue_${attemptId}`, {});
        delete currentQueue[qId];
        storage.set(`queue_${attemptId}`, currentQueue);
      } catch (err) {
        console.error(`Retry auto-save failed for question ${qId}:`, err);
        allSucceeded = false;
      }
    }

    if (allSucceeded) {
      setSaving('Saved');
    } else {
      setSaving('Retrying...');
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(processQueue, 5000);
    }
  };

  const saveAnswer = async (questionId, option) => {
    // 1. Update local state
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: option };
      if (attemptId) {
        storage.set(`answers_${attemptId}`, updated);
      }
      return updated;
    });

    // 2. Add to localStorage retry queue
    if (attemptId) {
      const queue = storage.get(`queue_${attemptId}`, {});
      queue[questionId] = option;
      storage.set(`queue_${attemptId}`, queue);
    }

    // 3. Trigger processing
    await processQueue();
  };

  // On mount and network reconnect, try processing the queue
  useEffect(() => {
    if (attemptId) {
      processQueue();

      const handleOnline = () => {
        processQueue();
      };

      window.addEventListener('online', handleOnline);
      return () => {
        window.removeEventListener('online', handleOnline);
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      };
    }
  }, [attemptId]);

  return {
    answers,
    saving,
    saveAnswer
  };
}
