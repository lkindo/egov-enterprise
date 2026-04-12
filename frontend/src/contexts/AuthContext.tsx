'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, UserInfo } from '@/services/foundation/auth/authService';

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (credentials: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');

    // 토큰이 없으면 인증 확인 건너뜀
    if (!token) {
      setUser(null);
      setLoading(false);
      // 쿠키도 명시적으로 제거하여 싱크 맞춤
      document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      return;
    }

    // [중요] localStorage 에는 토큰이 있으나 쿠키가 없는 경우 동기화하여 미들웨어 통과 지원
    const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('accessToken='));
    if (!hasCookie && token) {
      document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Lax`;
    }

    try {
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.warn('[AuthContext] 인증 유효성 검사 실패:', error);
      setUser(null);
      localStorage.removeItem('accessToken');
      document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: Record<string, string>) => {
    try {
      // 백엔드 기대 필드명 변환: id -> userId
      const loginData = {
        userId: credentials.id,
        password: credentials.password,
      };
      const data = await authService.login(loginData);

      if (data && data.accessToken) {
        // 1. localStorage 저장 (우선)
        localStorage.setItem('accessToken', data.accessToken);

        // 2. 쿠키 저장 (middleware 및 SSR용)
        document.cookie = `accessToken=${data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
        if (data.role) {
          document.cookie = `userRole=${data.role}; path=/; max-age=86400; SameSite=Lax`;
        }

        // 3. 전역 상태 업데이트 (즉시 반영)
        const userData = await authService.getCurrentUser();
        setUser(userData);

        // 4. 디버깅 로그 확인
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthContext] Login successful, user set to:', userData);
        }
      } else {
        throw new Error('인증 정보가 올바르지 않습니다.');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      console.error('Login process error:', message);
      throw new Error(message);
    }
  }, []);

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
