import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth";

export const axiosInstance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/v1`,
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export type ApiResponse<T = unknown> = {
  data?: T;
  message: string;
  status: "success" | "error";
  timestamp?: string;
  requestId?: string;
};

// Extend the axios types to include our custom metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: Date;
    };
    _retry?: boolean;
  }
}

// Track refresh token requests to prevent multiple simultaneous calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token?: string) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  
  failedQueue = [];
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time for monitoring
    const config = response.config;
    if (config.metadata?.startTime) {
      const duration = new Date().getTime() - config.metadata.startTime.getTime();
      console.debug(`API call to ${config.url} took ${duration}ms`);
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        clearTokens();
        redirectToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await refreshAccessToken(refreshToken);
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        
        setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        return axiosInstance(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError, undefined);
        clearTokens();
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other error types
    handleApiError(error);
    return Promise.reject(error);
  }
);

// Helper functions
const refreshAccessToken = async (refreshToken: string) => {
  return axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/admin/refresh-token`,
    { token: refreshToken },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    }
  );
};

const redirectToLogin = () => {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('redirectAfterLogin', currentPath);
    window.location.href = "/login";
  }
};

const handleApiError = (error: AxiosError) => {
  if (error.code === 'ECONNABORTED') {
    console.error('Request timeout:', error.message);
  } else if (error.response) {
    const status = error.response.status;
    const message = (error.response.data as any)?.message || error.message;
    
    console.error(`API Error ${status}:`, message);
    
    switch (status) {
      case 403:
        console.warn('Access forbidden - insufficient permissions');
        break;
      case 404:
        console.warn('Resource not found');
        break;
      case 422:
        console.warn('Validation error:', error.response.data);
        break;
      case 429:
        console.warn('Rate limit exceeded');
        break;
      case 500:
        console.error('Internal server error');
        break;
      default:
        console.error('Unexpected error:', error.response.data);
    }
  } else if (error.request) {
    console.error('Network error:', error.message);
  }
};

export default axiosInstance;
