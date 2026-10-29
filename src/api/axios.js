import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').trim();

console.log("API lue depuis .env:", apiBaseUrl);

const backendUrl = apiBaseUrl.replace(/\/api\/?$/, '').trim();

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
});

export async function initializeApiSession() {
  try {
    await api.get(`${backendUrl}/sanctum/csrf-cookie`);
  } catch (e) {
    console.warn("CSRF cookie non récupéré, backend peut-être endormi:", e.message);
  }
}

export default api;