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
  }
};
