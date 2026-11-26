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
import { generateMetadata } from '@/app/login/page';

beforeEach(() => {
  request.locale = 'en';
  request.pathname = '/login';
  request.user = null;
  request.userReads = 0;
});

/**
 * 서버가 첫 문서를 그릴 로케일(ADR-0063) — 경로만 본다. 루트 레이아웃이 문서를 내보내기 전에 인증 조회를 기다리지 않는다(Codex 4차 검토:
 * 영어 로그인 첫 문서가 인증 백엔드 응답을 기다렸다).
 */
describe('requestEffectiveLocale', () => {
  it('영어를 고른 번역 화면은 영어, 번역을 마치지 않은 경로·경로를 모를 때는 한국어다', async () => {
    expect(await requestEffectiveLocale()).toBe('en');
    request.pathname = '/search';
    expect(await requestEffectiveLocale()).toBe('ko');
    request.pathname = null;
    expect(await requestEffectiveLocale()).toBe('ko');
  });

  it('현재 사용자를 읽지 않는다 — 임시 비밀번호 사용자여도 문서를 내보내기 전에 인증을 기다리지 않는다', async () => {
    request.user = { passwordChangeRequired: true };
    expect(await requestEffectiveLocale()).toBe('en');
    expect(request.userReads).toBe(0);
  });
});

/** 로그인 문서 제목 — 화면 로케일을 따르고, 이 경로에 한국어 전용 관문이 대신 그려지는 사용자에게는 관문의 한국어 제목이다. */
describe('로그인 generateMetadata', () => {
  it('영어·한국어 로케일의 로그인 제목', async () => {
    expect((await generateMetadata()).title).toMatch(/^Sign in \| /);
    request.locale = 'ko';
    expect((await generateMetadata()).title).toMatch(/^로그인 \| /);
  });

  it('임시 비밀번호 사용자에게는 고른 로케일과 무관하게 관문의 한국어 제목이다', async () => {
    request.user = { passwordChangeRequired: true };
    expect((await generateMetadata()).title).toMatch(/^비밀번호 변경 \| /);
  });
});
