import axios from 'axios';

const client = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

client.interceptors.response.use(
    (response) => response,
    (error) => {
        // 401은 미인증 상태의 정상적인 응답이므로 콘솔에 표시하지 않음
        if (error.response?.status !== 401) {
            console.error('API Error:', error);
        }
        return Promise.reject(error);
    }
);

export default client;
