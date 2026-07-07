import api, { attemptService } from './api';

export const proctorService = {
  recordTabSwitch: async (attemptId, offset) => {
    return attemptService.recordTabSwitch(attemptId, offset);
  },
  recordViolation: async (attemptId, code, meta, offset, imageFile) => {
    return attemptService.recordViolation(attemptId, code, meta, offset, imageFile);
  }
};
