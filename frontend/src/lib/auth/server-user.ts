import { cache } from 'react';
import { cookies } from 'next/headers';
import { VERIFIED_USER_HEADER, verifyVerifiedUserHeader } from '@/lib/auth/verified-user-forward';
import { authService, type UserInfo } from '@/services/foundation/auth/authService';

/**
 * 서버 컴포넌트의 현재 사용자. 요청 하나에서 한 번만 읽는다(React cache) — 레이아웃의 인증 공급자 초기값과 업무 홈 서버 자식이 같은
 * 결과를 쓴다. proxy.ts 가 이미 같은 요청에서 `/api/v1/auth/me` 를 검증해 서명 전달한 경우에는 재조회를 생략하고,
 * 서명이 없거나 검증에 실패하면 기존 백엔드 `/auth/me` 조회로 폴백한다.
 */
export const getServerUser = cache(async (): Promise<UserInfo | null> => {
  const accessToken = (await cookies()).get('accessToken')?.value;
  if (!accessToken) return null;
  try {
    const nextHeaders = await import('next/headers');
    if (typeof nextHeaders.headers === 'function') {
      const requestHeaders = await nextHeaders.headers();
      const forwarded = requestHeaders?.get(VERIFIED_USER_HEADER);
      if (forwarded) {
        const verified = await verifyVerifiedUserHeader(forwarded, accessToken);
        if (verified) return verified;
      }
    }
  } catch {
    // 일부 단위 테스트의 부분 next/headers 목 또는 요청 컨텍스트 밖 호출은 정상 백엔드 조회로 폴백한다.
  }
  try {
    return await authService.getCurrentUser();
  } catch {
    return null;
  }
});
