import axios from 'axios';

const client = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Required for HttpOnly Cookie (Refresh Token)
});

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized (Expired Access Token)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // Attempt to reissue tokens via HttpOnly cookie
                const response = await axios.post('/api/v1/auth/reissue', {}, { withCredentials: true });
                const { accessToken } = response.data.data;

                // Update original request with new token
                originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
                // Save token to local storage or state (if managed globally)
                localStorage.setItem('accessToken', accessToken);

                return client(originalRequest);
            } catch (reissueError) {
                // If refresh fails, redirect to login
                localStorage.removeItem('accessToken');
                if (typeof window !== 'undefined') {
                    window.location.href = '/login?expired=true';
                }
                return Promise.reject(reissueError);
            }
        }

        return Promise.reject(error);
    }
);

// Add Request Interceptor to attach Access Token
client.interceptors.request.use(
    (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default client;
