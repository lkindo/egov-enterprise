'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from '@/lib/api/client';

interface User {
    id: string;
    name: string;
    userSe: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: any) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// JWT 만료 여부 확인 함수
const isTokenExpired = (token: string) => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.exp) return false;
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    } catch (e) {
        return true;
    }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        
        if (!token || isTokenExpired(token)) {
            if (token) localStorage.removeItem('accessToken');
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            // client.ts 인터셉터 덕분에 알맹이(data)만 바로 받습니다.
            const userData = (await axios.get('/auth/me')) as any;
            if (userData) {
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (error: any) {
            if (error.response?.status !== 401) {
                console.error('Auth check error:', error);
            }
            setUser(null);
            localStorage.removeItem('accessToken');
            document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (credentials: any) => {
        try {
            // client.ts 인터셉터가 이미 data.data를 풀어서 줍니다.
            const data: any = await axios.post('/auth/login', credentials);
            
            if (data && data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                // 서버 사이드 컴포넌트(SSR) 접근을 위해 쿠키에도 저장
                document.cookie = `accessToken=${data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
                
                // 약간의 지연을 주어 인터셉터 반영 보장
                await new Promise(resolve => setTimeout(resolve, 50));
                await checkAuth();
            } else {
                throw new Error('인증 정보가 올바르지 않습니다.');
            }
        } catch (error: any) {
            // 에러 시 인터셉터가 본문을 그대로 던지므로 해당 구조에 맞춰 처리
            const message = error.response?.data?.message || error.message || 'Login failed';
            console.error('Login error:', message);
            throw new Error(message);
        }
    }, [checkAuth]);

    const logout = useCallback(async () => {
        try {
            await axios.post('/auth/logout');
            setUser(null);
            localStorage.removeItem('accessToken');
            document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        } catch (error) {
            console.error('Logout failed', error);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
