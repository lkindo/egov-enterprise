'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService, UserInfo } from '@/services/foundation/auth/authService';
import { advanceAuthorizationRequestEpoch, AUTHORIZATION_CHANGED_EVENT, markSignedIn, markSignedOut } from '@/lib/auth/authorization-state';
import type { AuthLoginData } from '@/lib/auth/auth-bff-contract';
import { loginErrorMessage } from '@/lib/auth/login-error';
import { getHttpStatus } from '@/lib/query/list-query-defaults';
import { announceSession, listenSession } from '@/lib/auth/session-broadcast';
import { purgeSessionListState } from '@/lib/hooks/use-session-list-state';
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
  /** {@code afterAuthorizationChange} 는 서버가 권한 변경(버전 충돌 등)을 알린 뒤의 확인이다 — 답을 받지 못하면 이전 권한을 남기지 않는다. */
  checkAuth: (options?: AuthCheckOptions) => Promise<void>;
  enterMfaChallenge: () => void;
}

export interface AuthCheckOptions {
  afterAuthorizationChange?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** 응답 없이 끝난 전송 실패의 axios 코드 — 연결 끊김·시간 초과다. */
const TRANSPORT_FAILURE_CODES: readonly string[] = ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];

/**
 * 현재 권한 조회가 답을 받지 못했는가(응답 없는 연결 끊김·시간 초과, 429, 5xx) — 세션이 끝났다는 답(401·403 등)과, 받은 답이
 * 계약에 맞지 않는 경우(응답 형식·식별자 검증 실패)와 가른다. 뒤의 둘은 신뢰할 수 없는 답이라 종전처럼 정리한다.
 *
 * [2026-11-21] 종전에는 어떤 실패든 로그아웃과 같은 정리(조회 캐시·게시글 초안·목록 조건 삭제)를 했다. 창을 다시 볼 때
 * 서버가 한 번 503 을 내면 작성 중이던 초안이 지워지고 비로그인으로 보였다 — 서버 실패로 유효한 입력을 잃지 않는다는
 * 헌법 제7조 2항·제12조 4항과 어긋난다. 권한 판정은 서버가 요청마다 다시 하므로, 같은 계정이라는 것 말고는 바뀐 신호가
 * 없는 일상 확인(포커스·화면 복귀·재시도)에 한해 화면의 권한 표시를 다음 확인까지 유지한다.
 */
export function isTransientAuthCheckFailure(error: unknown): boolean {
  const status = getHttpStatus(error);
  if (status === 429 || status >= 500) return true;
  if (status !== 0 || typeof error !== 'object' || error === null) return false;
  const { code, response } = error as { code?: unknown; response?: unknown };
  return response === undefined && typeof code === 'string' && TRANSPORT_FAILURE_CODES.includes(code);
}

/** 일시 장애 뒤 다시 묻는 간격(ms). 마지막 간격으로 회복될 때까지 계속 묻고, 포커스·온라인·권한 변경 신호가 먼저 오면 그 확인이 대신한다. */
export const TRANSIENT_AUTH_RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000] as const;

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
  const checkAuthRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const transientRetry = useRef<{ timer: ReturnType<typeof setTimeout> | null; attempt: number }>({ timer: null, attempt: 0 });
  const clearTransientRetry = useCallback(() => {
    if (transientRetry.current.timer) clearTimeout(transientRetry.current.timer);
    transientRetry.current = { timer: null, attempt: 0 };
  }, []);
  const scheduleTransientRetry = useCallback(() => {
    const retry = transientRetry.current;
    if (retry.timer) return;
    const delay = TRANSIENT_AUTH_RETRY_DELAYS_MS[Math.min(retry.attempt, TRANSIENT_AUTH_RETRY_DELAYS_MS.length - 1)];
    retry.attempt += 1;
    retry.timer = setTimeout(() => {
      retry.timer = null;
      void checkAuthRef.current();
    }, delay);
  }, []);
  const invalidateAuthCheck = useCallback(() => {
    ++requestEpoch.current;
    inFlightCheck.current = null;
    clearTransientRetry();
  }, [clearTransientRetry]);

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
    if (identityChanged || !nextUser) {
      purgeBoardDraftStorage();
      // 목록 조건(검색어 포함)도 사용자 귀속이다 — 다음 사용자가 이어받지 않게 함께 지운다.
      purgeSessionListState();
    }
    if (nextUser) markSignedIn();
    // [2026-10-21] 첫 화면 직후 재조회가 같은 사용자를 새 객체로 넣으면 context 가 바뀐다. 그때 스트리밍 공개를 기다리는
    //   셸 경계가 있으면 React 가 그 경계를 브라우저에서 다시 그리고 서버 사본이 잠시 숨은 채 남는다 — 내용이 같으면 두지 않는다.
    if (previous === nextUser || (previous && nextUser && JSON.stringify(previous) === JSON.stringify(nextUser))) return;
    currentUser.current = nextUser;
    setUser(nextUser);
  }, [queryClient]);

  /**
   * {@code afterChangeSignal} 은 다른 탭의 로그인이나 권한 변경 신호 뒤의 확인이다 — 계정이나 권한이 바뀌었을 수 있으므로
   * 답을 받지 못해도 이전 사용자를 남기지 않는다(일시 장애 유지는 일상 확인에만 쓴다).
   */
  const runAuthCheck = useCallback((afterChangeSignal: boolean): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();
    if (mfaPending.current) return Promise.resolve();
    if (inFlightCheck.current) return inFlightCheck.current;
    const epoch = ++requestEpoch.current;
    const pending = (async () => {
      try {
        const userData = await authService.getCurrentUser();
        if (epoch === requestEpoch.current) {
          clearTransientRetry();
          commitUser(userData ?? null);
        }
      } catch (error) {
        if (epoch !== requestEpoch.current) return;
        if (!afterChangeSignal && isTransientAuthCheckFailure(error)) {
          // 답을 받지 못한 것은 세션이 끝났다는 답이 아니다 — 지금 상태와 작성 중 입력을 두고 회복될 때까지 다시 묻는다.
          scheduleTransientRetry();
          return;
        }
        // A rejected current-authority response must not preserve old grants.
        clearTransientRetry();
        commitUser(null);
      } finally {
        if (epoch === requestEpoch.current) setLoading(false);
      }
    })();
    inFlightCheck.current = pending;
    void pending.finally(() => {
      if (inFlightCheck.current === pending) inFlightCheck.current = null;
    });
    return pending;
  }, [clearTransientRetry, commitUser, scheduleTransientRetry]);

  const checkAuth = useCallback((options?: AuthCheckOptions): Promise<void> => {
    if (!options?.afterAuthorizationChange) return runAuthCheck(false);
    // 진행 중인 일상 확인이 이 확인을 대신하지 않게 먼저 무효화한다.
    invalidateAuthCheck();
    return runAuthCheck(true);
  }, [invalidateAuthCheck, runAuthCheck]);

  useEffect(() => {
    checkAuthRef.current = () => runAuthCheck(false);
  }, [runAuthCheck]);

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
    clearTransientRetry();
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
      // 공유 세션 쿠키가 이 응답으로 바뀌었다 — 다른 탭이 이전 계정 상태로 남지 않게 현재 사용자 확인보다 먼저 알린다(결정 17).
      announceSession({ type: 'signed-in' });
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
  }, [clearTransientRetry, commitUser, enterMfaChallenge]);

  const logout = useCallback(async () => {
    mfaPending.current = false;
    setMfaPending(false);
    // 캐시를 비우기 전에 막는다 — 비운 순간 다시 렌더되는 화면의 조회가 여기서 취소된다(DIP B4).
    markSignedOut();
    advanceAuthorizationRequestEpoch();
    ++requestEpoch.current;
    inFlightCheck.current = null;
    clearTransientRetry();
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
      purgeSessionListState();
      announceSession({ type: 'signed-out' });
    }
  }, [clearTransientRetry, commitUser]);

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
      void runAuthCheck(true);
    };
    // [2026-10-01 결정 17] 다른 탭의 로그인·로그아웃을 따른다. 로그아웃은 '만료' 안내 없이 로그인 화면으로 보낸다 —
    //   사용자가 직접 한 일이다. 다시 로그인했으면 서버에 현재 사용자를 다시 묻는다.
    const stopListening = listenSession((message) => {
      if (message.type === 'signed-in') {
        authorizationChanged();
        return;
      }
      // 지금 사용자가 없어도 진행 중인 확인이 이전 사용자를 되살리지 않게 먼저 무효화한다.
      invalidateAuthCheck();
      if (!currentUser.current) {
        setLoading(false);
        return;
      }
      markSignedOut();
      advanceAuthorizationRequestEpoch();
      commitUser(null);
      window.location.replace('/login');
    });
    window.addEventListener('focus', refreshAuthorization);
    window.addEventListener('online', refreshAuthorization);
    window.addEventListener(AUTHORIZATION_CHANGED_EVENT, authorizationChanged);
    document.addEventListener('visibilitychange', refreshAuthorization);
    return () => {
      stopListening();
      invalidateAuthCheck();
      window.removeEventListener('focus', refreshAuthorization);
      window.removeEventListener('online', refreshAuthorization);
      window.removeEventListener(AUTHORIZATION_CHANGED_EVENT, authorizationChanged);
      document.removeEventListener('visibilitychange', refreshAuthorization);
    };
  }, [checkAuth, commitUser, invalidateAuthCheck, runAuthCheck]);

  // 값이 바뀔 때만 새 객체다 — 이 공급자는 앱 전체를 감싸므로 바뀌지 않은 값으로 아래 경계를 깨우지 않는다.
  const value = useMemo(
    () => ({ user, loading, mfaPending: isMfaPending, login, logout, checkAuth, enterMfaChallenge }),
    [user, loading, isMfaPending, login, logout, checkAuth, enterMfaChallenge],
  );

  return (
    <AuthContext.Provider value={value}>
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
