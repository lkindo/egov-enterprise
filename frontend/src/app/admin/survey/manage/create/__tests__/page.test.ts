// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

/**
 * 설문 등록 옛 경로는 2단 연쇄 없이 최종 목적지로 바로 보낸다(2026-11-08, IA §9.4).
 * 시험은 화면 옆에 둔다 — 공용 게이트 폴더(src/__tests__)에 두면 이 화면을 빼는 생성 구성에서 시험이 연쇄로 지워진다.
 */
const mocks = vi.hoisted(() => ({
  redirect: vi.fn((target: string) => { throw new Error(`REDIRECT ${target}`); }),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));

const { default: SurveyCreateRedirect } = await import('../page');

describe('설문 등록 옛 경로', () => {
  it('목록을 거치지 않고 허브의 관리 탭으로 바로 보낸다', () => {
    expect(() => SurveyCreateRedirect()).toThrow('REDIRECT /admin/survey/hub?tab=manage');
  });
});
