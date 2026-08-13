import api from './api';

export const recordingService = {
  startSession: async (attemptId) => {
    const response = await api.post('/proctoring/start', { attemptId });
    return response.data;
  },

  uploadRecording: async (blobOrFile, attemptId, sessionId) => {
    const formData = new FormData();
    formData.append('video', blobOrFile, `recording_${attemptId}.webm`);
    formData.append('attemptId', attemptId);
    if (sessionId) {
      formData.append('sessionId', sessionId);
    }

    const response = await api.post('/proctoring/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};
