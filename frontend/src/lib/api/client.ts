import axios from 'axios';

// Determine the base URL based on environment
const getBaseURL = () => {
  if (typeof window === 'undefined') {
    // Server-side (SSR) - use the backend server directly
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
  } else {
    // Client-side - use relative path for proxy
    return '/api/v1';
  }
};

const client = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Add Request Interceptor to attach Access Token
client.interceptors.request.use(
    (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
            if (process.env.NODE_ENV === 'development') {
                console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isRetrying = false;

client.interceptors.response.use(
    (response) => {
        // 백엔드 ApiResponse { success, code, message, data } 구조에서 data만 추출하여 반환
        // axios 가 응답 본문을 response.data 에 담으므로, 실제 데이터는 response.data.data 가 됨
        if (response.data && response.data.success === true && 'data' in response.data) {
            return response.data.data;
        }
        return response.data; // success 가 false 이거나 다른 구조인 경우 전체 반환
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry && !isRetrying) {
            originalRequest._retry = true;
            isRetrying = true;
            
            try {
                // reissue API 역시 이제 interceptor 에 의해 data 만 반환함
                const data = await axios.post('/api/v1/auth/reissue', {}, { withCredentials: true });
                const accessToken = data.data?.accessToken || data.accessToken;

                originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
                localStorage.setItem('accessToken', accessToken);

                isRetrying = false;
                return client(originalRequest);
            } catch (reissueError) {
                isRetrying = false;
                localStorage.removeItem('accessToken');
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                    window.location.href = '/login?expired=true';
                }
                return Promise.reject(reissueError);
            }
        }
        return Promise.reject(error);
    }
);

export default client;
