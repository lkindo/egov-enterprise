'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, UserInfo } from '@/services/foundation/auth/authService';
import { LOGIN_FAILURE_MESSAGE } from '@/lib/auth/login-error';
import {
  purgeBoardDraftStorage,
  purgeLegacyBoardDraftStorage,
} from '@/lib/drafts/board-draft-storage';

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (credentials: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  children,
  initialUser = null
}: { 
  children: React.ReactNode;
  initialUser?: UserInfo | null;
}) {
  const [user, setUser] = useState<UserInfo | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);

  const checkAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      // HttpOnly 쿠키 기반이므로 로컬스토리지 토큰 유무에 상관없이 로그인 세션 여부를 직접 호출해 체크
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch {
      // 401 등 세션 만료 시 처리
      setUser(null);
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
      
      // Next.js Route Handler 로그인 호출 (토큰은 쿠키로 설정됨)
      await authService.login(loginData);

      // 전역 상태 업데이트
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch {
      throw new Error(LOGIN_FAILURE_MESSAGE);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Next.js Route Handler 로그아웃 호출 (쿠키 만료 처리 포함)
      await authService.logout();
    } catch {
      // 로그아웃 요청이 실패해도 로컬 인증 상태는 반드시 제거한다.
    } finally {
      // 게시글 본문은 사용자 귀속 데이터다. 원격 로그아웃 성공 여부와 무관하게 현재 브라우저의
      // scoped/legacy 초안을 함께 지워 다음 로그인 사용자가 복원하지 못하게 한다.
      if (typeof window !== 'undefined') purgeBoardDraftStorage(window.localStorage);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // 구 키는 owner를 판별할 수 없어 어느 계정에도 안전하게 귀속할 수 없다. 복원하지 않고 제거한다.
    purgeLegacyBoardDraftStorage(window.localStorage);
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
