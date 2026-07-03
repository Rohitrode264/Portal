import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('portal_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: any) => void; }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Single Session Enforcement: Immediately logout if session was terminated from another device
    if (error.response?.status === 401 && error.response?.data?.error === 'SESSION_TERMINATED') {
      localStorage.removeItem('portal_token');
      localStorage.removeItem('portal_refresh_token');
      localStorage.removeItem('portal_user');
      alert('Security Notice: You have been logged out because your account was accessed from another device or session.');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('portal_refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('portal_token');
        localStorage.removeItem('portal_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refreshToken
        });

        const newAccessToken = response.data.accessToken;
        localStorage.setItem('portal_token', newAccessToken);
        
        processQueue(null, newAccessToken);
        
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
        return api(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('portal_token');
        localStorage.removeItem('portal_refresh_token');
        localStorage.removeItem('portal_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
