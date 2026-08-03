import api from '../../services/api';

export const proctorService = {
  reportViolation: async (attemptId, type, timestamp) => {
    const response = await api.post(`/exams/attempts/${attemptId}/violations`, {
      type,
      timestamp
    });
    return response.data;
  },
  terminateExam: async (attemptId) => {
    const response = await api.post(`/exams/attempts/${attemptId}/terminate`);
    return response.data;
  }
};
