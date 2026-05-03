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

// Response Interceptor: Handle errors by returning mock data for presentation
api.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
        console.warn('Unauthorized API call - invalid token');
    }

    // Presentation Mode Mock Data Fallback:
    const config = error.config;
    if (config) {
        console.warn(`Mocking failed request to ${config.url}`);
        
        if (config.url.includes('/topics')) {
            return Promise.resolve({
                data: [
                    { id: '1', title: 'Top 5 AI Tools in 2024', description: 'Exploring the best artificial intelligence tools currently dominating the market for creators.', is_trending: true, confidence_score: 0.95, keywords: ['AI', 'tools', '2024'] },
                    { id: '2', title: 'How to Build an Audience on LinkedIn', description: 'Actionable strategies for organic growth and professional networking.', is_trending: true, confidence_score: 0.88, keywords: ['LinkedIn', 'Growth', 'Audience'] },
                    { id: '3', title: 'The Future of Remote Work', description: 'Analyzing the long-term impacts of distributed teams on productivity.', is_trending: false, confidence_score: 0.72, keywords: ['Remote', 'Work', 'Future'] }
                ]
            });
        }
        if (config.url.includes('/trends')) {
            return Promise.resolve({
                data: [
                    { id: 't1', title: 'Generative AI Workflows', status: 'completed', categories: ['AI', 'Productivity'], priority_score: 9.2, requested_at: new Date().toISOString(), generated_at: new Date().toISOString() },
                    { id: 't2', title: 'Creator Economy Monetization', status: 'completed', categories: ['Business', 'Creators'], priority_score: 8.5, requested_at: new Date().toISOString(), generated_at: new Date().toISOString() },
                    { id: 't3', title: 'Algorithm Updates Q2', status: 'processing', categories: ['Social Media'], priority_score: 0, requested_at: new Date().toISOString() }
                ]
            });
        }
        if (config.url.includes('/drafts')) {
            return Promise.resolve({
                data: [
                    { id: 'd1', title: 'My AI Journey', status: 'published', platform: 'linkedin' },
                    { id: 'd2', title: 'Growth Hacks', status: 'scheduled', platform: 'linkedin' },
                    { id: 'd3', title: 'Opinion on the new model', status: 'draft', platform: 'twitter' }
                ]
            });
        }
        if (config.url.includes('/linkedin/status')) {
            return Promise.resolve({ data: { connected: true, tokenValid: true } });
        }
        if (config.url.includes('/content/ingested')) {
            return Promise.resolve({
                data: [
                    { id: 'c1', title: 'The Rise of AI Agents', raw_content: 'AI agents are becoming the new standard for automation...', status: 'processed', sources: { source_type: 'RSS', source_name: 'TechCrunch' }, published_at: new Date().toISOString() },
                    { id: 'c2', title: 'Why LinkedIn reach is dropping', raw_content: 'Understanding the newest algorithm shift...', status: 'processed', sources: { source_type: 'Twitter', source_name: '@creatorpulse' }, published_at: new Date().toISOString() }
                ]
            });
        }
        
    }

    return Promise.reject(error);
});
