// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 옛 경로가 정본으로 보낼 때 경로 값을 다루는 방식(2026-11-08, IA §9.1.4·§9.4).
 *
 * - 동적 id 를 그대로 실어 보내지 않는다: 정본과 같은 규칙(양의 안전 정수)으로 검증해 정규화한 값만 보내고, 아니면 없는 화면이다.
 *   종전에는 받은 문자열을 그대로 붙였다(`/a/../b`·`%2F` 같은 값이 목적지 경로를 바꿀 수 있었다).
 * - 2단 연쇄 없이 최종 목적지로 바로 보낸다.
 */
const mocks = vi.hoisted(() => ({
  redirect: vi.fn((target: string) => { throw new Error(`REDIRECT ${target}`); }),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));

const { default: DeptJobDetailRedirect } = await import('../app/smart-toolkit/dept-job/selectDeptJobDetail/[id]/page');
const { default: CommunityRedirect } = await import('../app/admin/community/[id]/page');
const { default: SurveyCreateRedirect } = await import('../app/admin/survey/manage/create/page');

const call = (page: (props: { params: Promise<{ id: string }> }) => unknown, id: string) =>
  Promise.resolve().then(() => page({ params: Promise.resolve({ id }) }));

describe.each([
  ['업무 상세 옛 경로', DeptJobDetailRedirect, '/smart-toolkit/dept-job/'],
  ['커뮤니티 옛 경로', CommunityRedirect, '/cop/cmy/selectCommunityDetail/'],
])('%s', (_label, page, prefix) => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['abc', '0', '-3', '1.5', '../admin', '9007199254740993', ''])('형식이 아닌 id(%s)는 없는 화면이다 — 보내지 않는다', async (id) => {
    await expect(call(page, id)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('양의 정수 id 는 정규화해 정본으로 보낸다', async () => {
    await expect(call(page, '0042')).rejects.toThrow(`REDIRECT ${prefix}42`);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});

describe('설문 등록 옛 경로', () => {
  it('목록을 거치지 않고 허브의 관리 탭으로 바로 보낸다', () => {
    expect(() => SurveyCreateRedirect()).toThrow('REDIRECT /admin/survey/hub?tab=manage');
  });
});
