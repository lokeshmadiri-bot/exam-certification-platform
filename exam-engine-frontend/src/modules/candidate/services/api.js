import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry / unauthenticated requests
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
async function encryptPassword(password) {
  try {
    if (!window.crypto || !window.crypto.subtle) {
      return btoa(password);
    }
    const keyText = "OryFolksCertifyK";
    const ivText = "OryFolksCertifyI";
    const enc = new TextEncoder();
    const rawKey = enc.encode(keyText);
    const iv = enc.encode(ivText);
    const key = await window.crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-CBC" },
      false,
      ["encrypt"]
    );
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-CBC", iv: iv },
      key,
      enc.encode(password)
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  } catch (err) {
    console.error("Encryption failed, falling back to base64", err);
    return btoa(password);
  }
}

export const authService = {
  login: async (username, password) => {
    const encryptedPassword = await encryptPassword(password);
    const response = await api.post('/auth/login', { username, password: encryptedPassword });
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};

export const examService = {
  getAllExams: async () => {
    const response = await api.get('/exams');
    return response.data;
  },
  getExamById: async (id) => {
    const response = await api.get(`/exams/${id}`);
    return response.data;
  },
  getQuestions: async (examId) => {
    const response = await api.get(`/exams/${examId}/questions`);
    return response.data;
  },
  createExam: async (exam) => {
    const response = await api.post('/exams', exam);
    return response.data;
  },
  addQuestion: async (examId, question) => {
    const response = await api.post(`/exams/${examId}/questions`, question);
    return response.data;
  },
  updateStatus: async (examId, status) => {
    const response = await api.put(`/exams/${examId}/status?status=${status}`);
    return response.data;
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
  submitAttemptNew: async (attemptId) => {
    const response = await api.post(`/exams/attempts/${attemptId}/submit`);
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

export const attemptService = {
  getAllAttempts: async () => {
    const response = await api.get('/attempts');
    return response.data;
  },
  getAttemptDetail: async (id) => {
    const response = await api.get(`/attempts/${id}`);
    return response.data;
  },
  getMyAttempts: async () => {
    const response = await api.get('/attempts/my-attempts');
    return response.data;
  },
  startAttempt: async (examId) => {
    const response = await api.post("/candidate/attempts/start", {
      examId
    });
    return response.data;
  },
  recordTabSwitch: async (attemptId, offset) => {
    const response = await api.post(`/attempts/${attemptId}/tab-switch?offset=${offset}`);
    return response.data;
  },
  recordViolation: async (attemptId, code, meta, offset, imageFile) => {
    const formData = new FormData();
    formData.append('code', code);
    formData.append('meta', meta);
    formData.append('offset', offset);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    const response = await api.post(`/attempts/${attemptId}/violation`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  submitAttempt: async (attemptId, submissions) => {
    const response = await api.post(`/attempts/${attemptId}/submit`, submissions);
    return response.data;
  }
};

export const adminService = {
  getCandidates: async () => {
    const response = await api.get('/admin/candidates');
    return response.data;
  },
  approveOverride: async (candidateId, examId) => {
    const response = await api.post(
      `/admin/candidates/${candidateId}/override`,
      {
        examId
      }
    );
    return response.data;
  },
  getAuditLogs: async () => {
    const response = await api.get('/admin/logs');
    return response.data;
  }
};

export const candidateService = {
  // Candidate Dashboard
  getDashboard: async () => {
    const response = await api.get('/candidate/dashboard');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/candidate/profile");
    return response.data;
  },

  // Candidate Attempt History
  getMyAttempts: async () => {
    const response = await api.get('/candidate/attempts');
    return response.data;
  },

  // Candidate Attempt Details
  getAttemptDetails: async (attemptId) => {
    const response = await api.get(`/candidate/attempts/${attemptId}`);
    return response.data;
  },

  // Candidate Results
  getMyResults: async () => {
    const response = await api.get('/candidate/results');
    return response.data;
  },

  // Candidate Notifications
  getNotifications: async () => {
    const response = await api.get('/candidate/notifications');
    return response.data;
  }
};

export default api;
