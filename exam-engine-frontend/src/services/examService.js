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
  saveAnswer: async (attemptId, questionId, selectedOption, optionId) => {
    const response = await api.post(`/exams/attempts/${attemptId}/answers`, { questionId, selectedOption, optionId });
    return response.data;
  },
  submitAttemptNew: async (request) => {
    const response = await api.post("/candidate/attempts/submit", request);
    return response.data;
  },
  getRemainingTime: async (attemptId) => {
    const response = await api.get(`/exams/attempts/${attemptId}/timer`);
    return response.data;
  },
  getIntegritySettings: async (attemptId) => {
    const response = await api.get(`/exams/attempts/${attemptId}/integrity`);
    return response.data;
  }
};
