// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

/**
 * Q&A 옛 경로는 지식 허브의 Q&A 탭으로 보내되 기존 진입을 보존한다(2026-11-08 DEC-OPS-407).
 * 종전 화면은 기본 탭이 QNA 였다.
 */
const mocks = vi.hoisted(() => ({
  redirect: vi.fn((target: string) => { throw new Error(`REDIRECT ${target}`); }),
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

const { default: QnaRedirectPage } = await import('../page');

const target = async (params: Record<string, string | string[] | undefined>) => {
  await expect(QnaRedirectPage({ searchParams: Promise.resolve(params) })).rejects.toThrow(/^REDIRECT /);
  return String(mocks.redirect.mock.calls.at(-1)?.[0]);
};

describe('Q&A 옛 경로', () => {
  it('쿼리가 없으면 Q&A 탭으로 간다 — 종전 기본 탭', async () => {
    expect(await target({})).toBe('/admin/help?tab=QNA');
  });

  it.each([
    ['faq', 'FAQ'], ['WIKI', 'WIKI'], ['qna', 'QNA'],
  ])('지식 허브 고유 탭(%s)은 그 탭으로 간다', async (tab, expected) => {
    expect(await target({ tab })).toBe(`/admin/help?tab=${expected}`);
  });

  // 이 화면에서 탭을 누르면 허브가 지금 경로를 유지해 /admin/help/qna?tab=COMMUNITY 를 만든다 — 그 주소는 같은 탭에 닿아야 한다(Codex 16차).
  it.each([['COMMUNITY'], ['community']])('이 구성에 있는 기여 탭(%s)은 그 탭으로 간다', async (tab) => {
    expect(await target({ tab })).toBe('/admin/help?tab=COMMUNITY');
  });

  it.each([['bogus'], [''], ['%57IKI']])('알 수 없는 값(%s)은 Q&A 로 간다 — 정본 기본 탭(WIKI)이 아니라 종전 기본 탭', async (tab) => {
    expect(await target({ tab })).toBe('/admin/help?tab=QNA');
  });

  it('반복된 tab 은 첫 값으로 판정한다', async () => {
    expect(await target({ tab: ['FAQ', 'WIKI'] })).toBe('/admin/help?tab=FAQ');
  });

  // bbsId 등은 넘기지 않는다 — 앱은 이 옛 주소에 그런 키를 붙여 만들지 않고, 허브도 탭을 바꿀 때 bbsId 를 버린다.
  it('tab 밖의 키는 넘기지 않는다', async () => {
    expect(await target({ tab: 'FAQ', page: '3', q: 'x', bbsId: 'BBSMSTR_AAAAAAAAAAAA' })).toBe('/admin/help?tab=FAQ');
  });
});
