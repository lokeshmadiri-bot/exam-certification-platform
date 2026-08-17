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
  },

  /**
   * Upload a camera snapshot (JPEG blob or base64 data URL) captured at violation time.
   * Returns { snapshotUrl: "http://minio-host/bucket/..." }
   */
  uploadSnapshot: async (attemptId, blob) => {
    const formData = new FormData();
    formData.append('snapshot', blob, 'snapshot.jpg');
    const response = await api.post(`/proctoring/snapshot/${attemptId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};
