import { useEffect } from 'react';
import { useExam } from '../context/ExamContext';
import { storage } from '../utils/storage';

export function useAutoSave() {
  const { selectedAnswers, setSelectedAnswers, attemptId } = useExam();

  // Load initial saved answers from storage
  useEffect(() => {
    if (attemptId) {
      const saved = storage.get(`answers_${attemptId}`);
      if (saved) {
        setSelectedAnswers(saved);
      }
    }
  }, [attemptId, setSelectedAnswers]);

  // Persist selectedAnswers changes
  const saveAnswer = (questionId, option) => {
    setSelectedAnswers((prev) => {
      const updated = { ...prev, [questionId]: option };
      if (attemptId) {
        storage.set(`answers_${attemptId}`, updated);
      }
      return updated;
    });
  };

  return {
    selectedAnswers,
    saveAnswer
  };
}
