import { useExam } from '../context/ExamContext';
import { storage } from '../utils/storage';
import { examService } from '../services/examService';

export function useAutoSave() {
  const { answers, setAnswers, attemptId } = useExam();

  const saveAnswer = async (questionId, option) => {
    // Update local state
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: option };
      if (attemptId) {
        storage.set(`answers_${attemptId}`, updated);
      }
      return updated;
    });

    // Sync to database
    if (attemptId) {
      try {
        await examService.saveAnswer(attemptId, questionId, option);
      } catch (err) {
        console.error('Failed to sync answer to database:', err);
      }
    }
  };

  return {
    answers,
    saveAnswer
  };
}
