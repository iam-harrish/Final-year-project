import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Only clear token and redirect on auth endpoints or if it's an expired token
            const isAuthEndpoint = error.config.url.includes('/auth/');
            if (!isAuthEndpoint) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    login: (username, password) =>
        api.post('/auth/login', { username, password }),
    register: (username, email, password) =>
        api.post('/auth/register', { username, email, password }),
    me: () => api.get('/auth/me'),
};

export const predictionAPI = {
    predict: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/predict', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    history: () => api.get('/history'),
};

export const metricsAPI = {
    getMetrics: () => api.get('/metrics'),
    howItWorks: () => api.get('/how-it-works'),
};

export default api;
