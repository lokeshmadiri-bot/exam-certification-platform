import api, { attemptService } from './api';

export const examService = {
  getAttemptDetail: async (attemptId) => {
    return attemptService.getAttemptDetail(attemptId);
  },
  startAttempt: async (examId) => {
    return attemptService.startAttempt(examId);
  },
  submitAttempt: async (attemptId, submissions) => {
    return attemptService.submitAttempt(attemptId, submissions);
  },
  startExamAttempt: async (examId) => {
    const response = await api.post(`/exams/${examId}/start`);
    return response.data;
  },
  getRunnerData: async (attemptId) => {
    const response = await api.get(`/exams/attempts/${attemptId}`);
    return response.data;
  },
  saveAnswer: async (attemptId, questionId, selectedOption) => {
    const response = await api.post(`/exams/attempts/${attemptId}/answers`, { questionId, selectedOption });
    return response.data;
  },
  submitAttemptNew: async (attemptId) => {
    const response = await api.post(`/exams/attempts/${attemptId}/submit`);
    return response.data;
  }
};
