'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService, UserInfo } from '@/services/foundation/auth/authService';
import { advanceAuthorizationRequestEpoch, AUTHORIZATION_CHANGED_EVENT, markSignedIn, markSignedOut } from '@/lib/auth/authorization-state';
import type { AuthLoginData } from '@/lib/auth/auth-bff-contract';
import { loginErrorMessage } from '@/lib/auth/login-error';
import {
  purgeBoardDraftStorage,
  purgePersistedBoardDraftStorage,
} from '@/lib/drafts/board-draft-storage';

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  mfaPending: boolean;
  login: (credentials: Record<string, string>) => Promise<AuthLoginData>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  enterMfaChallenge: () => void;
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
  const [isMfaPending, setMfaPending] = useState(false);
  const queryClient = useQueryClient();
  const currentUser = useRef(initialUser);
  const requestEpoch = useRef(0);
  const inFlightCheck = useRef<Promise<void> | null>(null);
  const mfaPending = useRef(false);
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
    if (nextUser) markSignedIn();
    currentUser.current = nextUser;
    setUser(nextUser);
  }, [queryClient]);

  const checkAuth = useCallback((): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();
    if (mfaPending.current) return Promise.resolve();
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

  const enterMfaChallenge = useCallback(() => {
    // Enrollment revokes the ordinary session. Stop polling/WS and discard delayed auth checks.
    mfaPending.current = true;
    setMfaPending(true);
    markSignedOut();
    invalidateAuthCheck();
    commitUser(null);
    setLoading(false);
  }, [commitUser, invalidateAuthCheck]);

  const login = useCallback(async (credentials: Record<string, string>) => {
    mfaPending.current = false;
    setMfaPending(false);
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
      const result = await authService.login(loginData);
      if (epoch !== requestEpoch.current) throw new Error('Superseded authentication attempt');
      if (result.authenticationStage === 'MFA_REQUIRED' || result.authenticationStage === 'ENROLLMENT_REQUIRED') {
        enterMfaChallenge();
        return result;
      }

      // 전역 상태 업데이트
      const userData = await authService.getCurrentUser();
      if (epoch !== requestEpoch.current) throw new Error('Superseded authentication attempt');
      commitUser(userData);
      return result;
    } catch (error) {
      // 요청 제한·서비스 장애만 따로 말하고 나머지는 같은 문구다(DIP D2).
      throw new Error(loginErrorMessage(error));
    } finally {
      if (epoch === requestEpoch.current) setLoading(false);
    }
  }, [commitUser, enterMfaChallenge]);

  const logout = useCallback(async () => {
    mfaPending.current = false;
    setMfaPending(false);
    // 캐시를 비우기 전에 막는다 — 비운 순간 다시 렌더되는 화면의 조회가 여기서 취소된다(DIP B4).
    markSignedOut();
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
    <AuthContext.Provider value={{ user, loading, mfaPending: isMfaPending, login, logout, checkAuth, enterMfaChallenge }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 공급자 밖에서는 undefined 를 돌려준다 — 권한에 따라 부가 기능만 켜고 끄는 곳(예: 수신자 피커의 부서 탭)이 쓴다.
 * 인증이 필요한 화면은 여전히 {@link useAuth} 로 공급자 부재를 오류로 드러낸다.
 */
export const useOptionalAuth = () => useContext(AuthContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
