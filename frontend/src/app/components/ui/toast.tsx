'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { toast as sonnerToast } from 'sonner';
import { userFacingErrorMessage } from '@/lib/safe-error-log';

type ToastType = 'success' | 'error' | 'info' | 'loading';

const GENERIC_FAILURE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

/*
 * [2026-09-30] 실패 한 번에 토스트는 하나다 — 주인은 실패를 아는 쪽이다.
 *
 * API 인터셉터는 모든 실패에 `api-error` 를 보내고, 호출한 화면도 catch 에서 과업 이름을 붙여 다시 알린다.
 * 둘 다 띄우면 같은 실패가 두 번(조회 재시도까지 세 번) 보인다. 그래서 전역 알림은 **대기**했다가, 화면이
 * 스스로 알리지 않은 실패만 띄운다.
 *
 * - 전역 알림은 매크로태스크 하나만큼 미룬다. 화면의 catch·mutation onError 는 거절 직후의 마이크로태스크에서
 *   돌므로 그 안에서 부른 오류 토스트가 대기 중인 전역 알림을 거둬 간다(화면이 주인).
 * - 거둬 간 전역 문구(서버가 준 사유, 또는 연결·시간 초과 안내)는 버리지 않는다. 화면 문구와 다르면 같은 토스트의
 *   설명 줄에 싣는다 — "무엇을 못 했는가"(화면)와 "왜"(서버)가 한 토스트에 함께 보인다.
 * - 화면이 늦게 알리는 경우(조회 실패를 effect 에서 알림)에는 이미 뜬 전역 토스트를 같은 id 로 **교체**한다.
 * - 전역 토스트의 id 는 문구다. 재시도가 같은 문구로 다시 실패해도 토스트는 쌓이지 않는다.
 *
 * 화면이 실패를 화면 안(오류 패널·배지)에서 보이는 조회는 요청에 `suppressErrorToast` 를 선언한다.
 */
const REPLACE_WINDOW_MS = 2000;
const pendingGlobalFailures = new Map<ReturnType<typeof setTimeout>, string>();
let lastGlobalFailure: { id: string; message: string; at: number } | null = null;

interface ClaimedFailure {
  /** 방금 뜬 전역 토스트의 id — 있으면 새 토스트를 쌓지 않고 그것을 교체한다. */
  replaceId?: string;
  /** 전역 알림이 말하려던 사유. 화면 문구와 같으면 비운다. */
  reason?: string;
}

/** 화면이 실패를 직접 알린다 — 대기 중이거나 방금 뜬 전역 알림을 거둬 간다. */
function claimFailureAnnouncement(displayMessage: string): ClaimedFailure {
  const reasons = new Set<string>();
  for (const [timer, message] of pendingGlobalFailures) {
    clearTimeout(timer);
    reasons.add(message);
  }
  pendingGlobalFailures.clear();

  const last = lastGlobalFailure;
  lastGlobalFailure = null;
  let replaceId: string | undefined;
  if (last && Date.now() - last.at <= REPLACE_WINDOW_MS) {
    replaceId = last.id;
    reasons.add(last.message);
  }

  reasons.delete(displayMessage);
  reasons.delete(GENERIC_FAILURE);
  return { replaceId, reason: reasons.size > 0 ? [...reasons].join(' ') : undefined };
}

/** 화면이 알리지 않은 실패만 띄운다. */
function announceUnclaimedFailure(message: unknown): void {
  const displayMessage = userFacingErrorMessage(message) ?? GENERIC_FAILURE;
  const timer = setTimeout(() => {
    pendingGlobalFailures.delete(timer);
    const id = `api-error:${displayMessage}`;
    sonnerToast.error(displayMessage, { id });
    lastGlobalFailure = { id, message: displayMessage, at: Date.now() };
  }, 0);
  pendingGlobalFailures.set(timer, displayMessage);
}

function cancelPendingFailureAnnouncements(): void {
  for (const timer of pendingGlobalFailures.keys()) clearTimeout(timer);
  pendingGlobalFailures.clear();
}

const noop = () => {};

export const useToast = () => {
  const toast = useCallback((message: unknown, type: ToastType = 'info') => {
    // Failsafe: format message as string to prevent rendering errors
    // [2026-09-15 DEC-OPS-100] 문자열을 포함한 모든 값에서 사용자 문장만 뽑는다 — 종전에는 객체를 JSON 원문으로,
    //   axios 오류는 transport 원문으로 보여 줬고, error.message 를 문자열로 넘긴 호출부의 transport 원문도 그대로 보였다.
    const displayMessage = userFacingErrorMessage(message) ?? GENERIC_FAILURE;

    if (type === 'success') {
      sonnerToast.success(displayMessage);
    } else if (type === 'error') {
      // 화면이 실패의 주인이다 — 같은 실패의 전역 알림을 취소하거나 교체한다(위 주석).
      const { replaceId, reason } = claimFailureAnnouncement(displayMessage);
      if (replaceId || reason) {
        sonnerToast.error(displayMessage, {
          ...(replaceId ? { id: replaceId } : {}),
          ...(reason ? { description: reason } : {}),
        });
      } else {
        sonnerToast.error(displayMessage);
      }
    } else if (type === 'loading') {
      sonnerToast.loading(displayMessage);
    } else {
      sonnerToast(displayMessage);
    }
  }, []);

  const success = useCallback((message: string) => toast(message, 'success'), [toast]);
  const error = useCallback((message: unknown) => toast(message, 'error'), [toast]);

  // 반환 객체는 렌더 사이에 같은 것을 유지한다 — `const toast = useToast()` 를 의존성 배열에 넣어도 효과가 다시 돌지 않는다.
  return useMemo(() => ({ toast, success, error, removeToast: noop }), [toast, success, error]);
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // API 오류 이벤트 리스너 등록
  useEffect(() => {
    const handleApiError = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { message, status } = detail;
      // 401(인증) 오류는 로그인 처리 영역에서 핸들링하므로 호출하지 않음
      if (status !== 401) {
        announceUnclaimedFailure(message);
      }
    };

    window.addEventListener('api-error', handleApiError);
    return () => {
      window.removeEventListener('api-error', handleApiError);
      cancelPendingFailureAnnouncements();
    };
  }, []);

  return <>{children}</>;
}
