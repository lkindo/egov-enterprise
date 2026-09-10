'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService, UserInfo } from '@/services/foundation/auth/authService';
import { advanceAuthorizationRequestEpoch, AUTHORIZATION_CHANGED_EVENT } from '@/lib/auth/authorization-state';
import { LOGIN_FAILURE_MESSAGE } from '@/lib/auth/login-error';
import {
  purgeBoardDraftStorage,
  purgePersistedBoardDraftStorage,
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
  const queryClient = useQueryClient();
  const currentUser = useRef(initialUser);
  const requestEpoch = useRef(0);
  const inFlightCheck = useRef<Promise<void> | null>(null);
  const invalidateAuthCheck = useCallback(() => {
    ++requestEpoch.current;
    inFlightCheck.current = null;
  }, []);

  const commitUser = useCallback((nextUser: UserInfo | null) => {
    const previous = currentUser.current;
    const identityChanged = previous?.id !== nextUser?.id || previous?.esntlId !== nextUser?.esntlId;
    const authorizationChanged = previous?.authorizationVersion !== nextUser?.authorizationVersion;
    if (identityChanged || authorizationChanged) {
      advanceAuthorizationRequestEpoch();
      // Cancel before removal so an old request cannot repopulate the next account's cache.
      void queryClient.cancelQueries();
      queryClient.clear();
    }
    if (identityChanged || !nextUser) purgeBoardDraftStorage();
    currentUser.current = nextUser;
    setUser(nextUser);
  }, [queryClient]);

  const checkAuth = useCallback((): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();
    if (inFlightCheck.current) return inFlightCheck.current;
    const epoch = ++requestEpoch.current;
    const pending = (async () => {
      try {
        const userData = await authService.getCurrentUser();
        if (epoch === requestEpoch.current) commitUser(userData ?? null);
      } catch {
        // An unavailable or rejected current-authority response must not preserve old grants.
        if (epoch === requestEpoch.current) commitUser(null);
      } finally {
        if (epoch === requestEpoch.current) setLoading(false);
      }
    })();
    inFlightCheck.current = pending;
    void pending.finally(() => {
      if (inFlightCheck.current === pending) inFlightCheck.current = null;
    });
    return pending;
  }, [commitUser]);

  const login = useCallback(async (credentials: Record<string, string>) => {
    advanceAuthorizationRequestEpoch();
    const epoch = ++requestEpoch.current;
    inFlightCheck.current = null;
    setLoading(true);
    commitUser(null);
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
      if (epoch === requestEpoch.current) commitUser(userData);
    } catch {
      throw new Error(LOGIN_FAILURE_MESSAGE);
    } finally {
      if (epoch === requestEpoch.current) setLoading(false);
    }
  }, [commitUser]);

  const logout = useCallback(async () => {
    advanceAuthorizationRequestEpoch();
    ++requestEpoch.current;
    inFlightCheck.current = null;
    commitUser(null);
    setLoading(false);
    try {
      // Next.js Route Handler 로그아웃 호출 (쿠키 만료 처리 포함)
      await authService.logout();
    } catch {
      // 로그아웃 요청이 실패해도 로컬 인증 상태는 반드시 제거한다.
    } finally {
      // 게시글 본문은 사용자 귀속 데이터다. 원격 로그아웃 성공 여부와 무관하게 현재 브라우저의
      // scoped/legacy 초안을 함께 지워 다음 로그인 사용자가 복원하지 못하게 한다.
      purgeBoardDraftStorage();
    }
  }, [commitUser]);

  useEffect(() => {
    // 구 키는 owner를 판별할 수 없어 어느 계정에도 안전하게 귀속할 수 없다. 복원하지 않고 제거한다.
    purgePersistedBoardDraftStorage();
    void checkAuth();
    const refreshAuthorization = () => {
      if (document.visibilityState !== 'hidden') void checkAuth();
    };
    const authorizationChanged = () => {
      // A check begun before a mutation/403 can contain the old grants. Start a newer check.
      invalidateAuthCheck();
      void checkAuth();
    };
    window.addEventListener('focus', refreshAuthorization);
    window.addEventListener(AUTHORIZATION_CHANGED_EVENT, authorizationChanged);
    document.addEventListener('visibilitychange', refreshAuthorization);
    return () => {
      invalidateAuthCheck();
      window.removeEventListener('focus', refreshAuthorization);
      window.removeEventListener(AUTHORIZATION_CHANGED_EVENT, authorizationChanged);
      document.removeEventListener('visibilitychange', refreshAuthorization);
    };
  }, [checkAuth, invalidateAuthCheck]);

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
