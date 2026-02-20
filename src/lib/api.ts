import axios from 'axios';
// import { supabase } from '@/integrations/supabase/client';

// Create Axios custom instance
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api', // Use relative path if proxy configured, or full URL
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach JWT
api.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('auth_token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Handle 401 (Auth Error)
api.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
        // Optional: Redirect to login or refresh session
        console.warn('Unauthorized API call - invalid token');
    }

    return Promise.reject(error);
});
