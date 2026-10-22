import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const backendUrl = apiBaseUrl.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
});

export async function initializeApiSession() {
  await api.get(`${backendUrl}/sanctum/csrf-cookie`);
}

export default api;
