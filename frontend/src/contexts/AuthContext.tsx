'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, UserInfo } from '@/services/authService';

interface AuthContextType {
    user: UserInfo | null;
    loading: boolean;
    login: (credentials: Record<string, string>) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// JWT 만료 여부 확인 함수 (브라우저 사이드 간단 체크)
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
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

        // 토큰이 없으면 인증 확인을 건너뜁니다.
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        // 토큰이 만료되었더라도 interceptor에서 reissue를 시도할 것이므로
        // /auth/me를 호출하여 최종 유효성을 검증합니다.
        try {
            const userData = await authService.getCurrentUser();
            if (userData) {
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (error: any) {
            // 401 에러는 interceptor가 토큰 재발급 실패 시 최종적으로 던집니다.
            setUser(null);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (credentials: Record<string, string>) => {
        try {
            const data = await authService.login(credentials);

            if (data && data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                // 서버 사이드 컴포넌트(SSR) 및 미들웨어 접근을 위해 쿠키에 저장
                document.cookie = `accessToken=${data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
                if (data.role) {
                    document.cookie = `userRole=${data.role}; path=/; max-age=86400; SameSite=Lax`;
                }

                // 전역 상태 업데이트를 위해 내 정보 조회
                await checkAuth();
            } else {
                throw new Error('인증 정보가 올바르지 않습니다.');
            }
        } catch (error: any) {
            const message = error.message || '로그인 중 오류가 발생했습니다.';
            console.error('Login process error:', message);
            throw new Error(message);
        }
    }, [checkAuth]);

    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout API call failed', error);
        } finally {
            setUser(null);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            }
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
