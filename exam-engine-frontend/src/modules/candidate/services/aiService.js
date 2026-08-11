import api from './api';

export const aiService = {
  recordFlag: async (attemptId, type, confidence = 0.95, snapshotUrl = null) => {
    const response = await api.post(`/proctoring/flags/${attemptId}`, {
      type,
      confidence,
      snapshotUrl
    });
    return response.data;
  },

  getFlags: async (attemptId) => {
    const response = await api.get(`/proctoring/flags/${attemptId}`);
    return response.data;
  },

  getSummary: async (attemptId) => {
    const response = await api.get(`/proctoring/summary/${attemptId}`);
    return response.data;
  }
};
