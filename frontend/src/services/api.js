import axios from 'axios';
import { getToken, logout } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized) - redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      logout();
      // Redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const getZones = async (districts = null) => {
  const params = districts ? { districts } : {};
  const response = await api.get('/api/zones', { params });
  return response.data;
};

export const getAttendees = async (zoneId) => {
  const response = await api.get(`/api/attendees/${zoneId}`);
  return response.data;
};

export const getAgendas = async () => {
  const response = await api.get('/api/agendas');
  return response.data;
};

export const saveMeeting = async (meetingData) => {
  const response = await api.post('/api/meetings', meetingData);
  return response.data;
};

export const getMeetingReport = async (meetingId) => {
  const response = await api.get(`/api/meetings/${meetingId}/report`);
  return response.data;
};

export const getAllMeetings = async (districts = null, page = 1, limit = 20, search = '', date = '') => {
  const params = { page, limit };
  if (districts) params.districts = districts;
  if (search) params.search = search;
  if (date) params.date = date;
  const response = await api.get('/api/meetings/list', { params });
  return response.data;
};

export const deleteMeeting = async (meetingId) => {
  const response = await api.delete(`/api/meetings/${meetingId}`);
  return response.data;
};


export const updateMeeting = async (meetingId, meetingData) => {
  const response = await api.put(`/api/meetings/${meetingId}`, meetingData);
  return response.data;
};

export const getDashboardStats = async (startDate, endDate, zoneId) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (zoneId) params.zoneId = zoneId;

  const response = await api.get('/api/dashboard/stats', { params });
  return response.data;
};

export const getAttendanceSummary = async (zoneId, startDate, endDate) => {
  const params = { zoneId };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const response = await api.get('/api/attendance-summary', { params });
  return response.data;
};

export const getSetting = async (key) => {
  const response = await api.get(`/api/settings/${key}`);
  return response.data;
};

export const updateSetting = async (key, value, description = '') => {
  const response = await api.post('/api/settings', { key, value, description });
  return response.data;
};

export default api;

