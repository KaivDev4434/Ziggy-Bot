import axios from 'axios';
import { API_BASE_URL, ApiError } from '../types';

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error);
    
    // Handle network errors
    if (!error.response) {
      throw new Error('Network error - please check if the backend server is running');
    }
    
    // Handle API errors
    const apiError: ApiError = {
      error: error.response?.data?.error || 'UNKNOWN_ERROR',
      message: error.response?.data?.message || 'An unknown error occurred',
    };
    
    throw apiError;
  }
);

export default apiClient;
