import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const examSyncService = {
  getAttemptStatus: async (attemptId) => {
    const response = await api.get(`/exams/attempts/${attemptId}/status`);
    return response.data;
  },

  syncAnswers: async (attemptId, answers, remainingSeconds, beginnerTimeRemaining, intermediateTimeRemaining, advancedTimeRemaining) => {
    const formattedAnswers = Array.isArray(answers)
      ? answers
      : Object.keys(answers || {}).map((qId) => ({
          questionId: qId,
          selectedOption: answers[qId]
        }));

    const response = await api.post(`/exams/attempts/${attemptId}/sync`, {
      answers: formattedAnswers,
      remainingSeconds,
      beginnerTimeRemaining,
      intermediateTimeRemaining,
      advancedTimeRemaining
    });
    return response.data;
  },

  sendBeaconData: (attemptId, answers, remainingSeconds, beginnerTimeRemaining, intermediateTimeRemaining, advancedTimeRemaining) => {
    const formattedAnswers = Array.isArray(answers)
      ? answers
      : Object.keys(answers || {}).map((qId) => ({
          questionId: qId,
          selectedOption: answers[qId]
        }));

    const payload = JSON.stringify({
      answers: formattedAnswers,
      remainingSeconds,
      beginnerTimeRemaining,
      intermediateTimeRemaining,
      advancedTimeRemaining
    });

    const targetUrl = `${API_BASE_URL}/exams/attempts/${attemptId}/beacon`;

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      return navigator.sendBeacon(targetUrl, blob);
    } else {
      fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
      return true;
    }
  }
};
