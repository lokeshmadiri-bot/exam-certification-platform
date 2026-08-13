import api, { attemptService } from './api';

export const proctorService = {
  recordTabSwitch: async (attemptId, offset) => {
    return attemptService.recordTabSwitch(attemptId, offset);
  },
  recordViolation: async (attemptId, code, meta, offset, imageFile) => {
    return attemptService.recordViolation(attemptId, code, meta, offset, imageFile);
  },
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
