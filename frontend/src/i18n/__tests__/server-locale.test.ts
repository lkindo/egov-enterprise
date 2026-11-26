import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.hoisted(() => ({
  locale: undefined as string | undefined,
  pathname: null as string | null,
  user: null as null | { passwordChangeRequired?: boolean },
  userReads: 0,
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'NEXT_LOCALE' && request.locale ? { value: request.locale } : undefined) }),
  headers: async () => ({ get: (name: string) => (name === 'x-app-pathname' ? request.pathname : null) }),
}));
vi.mock('@/lib/auth/server-user', () => ({
  getServerUser: async () => { request.userReads += 1; return request.user; },
}));

import { requestEffectiveLocale } from '../server-locale';

/** 서버가 첫 문서를 그릴 로케일(ADR-0063) — 경로와 임시 비밀번호 관문을 함께 본다. */
describe('requestEffectiveLocale', () => {
  beforeEach(() => {
    request.locale = 'en';
    request.pathname = '/login';
    request.user = null;
    request.userReads = 0;
  });

  it('영어를 고른 번역 화면은 영어다', async () => {
    expect(await requestEffectiveLocale()).toBe('en');
  });

  it('번역을 마치지 않은 경로·경로를 모를 때는 한국어이고 현재 사용자를 읽지 않는다', async () => {
    request.pathname = '/search';
    expect(await requestEffectiveLocale()).toBe('ko');
    request.pathname = null;
    expect(await requestEffectiveLocale()).toBe('ko');
    expect(request.userReads).toBe(0);
  });

  it('번역 화면이라도 임시 비밀번호 사용자에게는 관문이 대신 그려지므로 한국어다', async () => {
    request.user = { passwordChangeRequired: true };
    expect(await requestEffectiveLocale()).toBe('ko');
  });

  it('한국어를 고르면 현재 사용자를 읽지 않는다', async () => {
    request.locale = 'ko';
    request.user = { passwordChangeRequired: true };
    expect(await requestEffectiveLocale()).toBe('ko');
    expect(request.userReads).toBe(0);
  });
});
