import { cache } from 'react';
import { cookies } from 'next/headers';
import { authService, type UserInfo } from '@/services/foundation/auth/authService';

/**
 * 서버 컴포넌트의 현재 사용자. 요청 하나에서 한 번만 읽는다(React cache) — 레이아웃의 인증 공급자 초기값과 업무 홈 서버 자식이 같은
 * 결과를 쓴다. 토큰이 없거나 조회가 실패하면 null 이다(권한 상태를 모르는 주체 — 기능권한 판정은 모두 거짓이다).
 */
export const getServerUser = cache(async (): Promise<UserInfo | null> => {
  const accessToken = (await cookies()).get('accessToken')?.value;
  if (!accessToken) return null;
  try {
    return await authService.getCurrentUser();
  } catch {
    return null;
  }
});
