import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement } from 'react';

/**
 * 행정 구역·기관 코드 라우트가 서버 선조회 결과를 클라이언트에 넘기는 방식.
 *
 * [2026-11-08 화면 용어 원장 후속] 선조회가 실패하면 예전에는 `{ list: [], total: 0 }` 을 넘겨, 성공한 빈 첫 페이지와
 * 가를 수 없었다. 그래서 클라이언트는 빈 선채움을 아예 믿지 않았고, 서버가 확인한 0건도 응답 전에는 보이지 못했다(독립 검토 반례).
 * 이제 실패는 null 이고, 성공한 첫 페이지는 비어 있어도 그대로 넘긴다.
 */
const mocks = vi.hoisted(() => ({
  getAdministCodeList: vi.fn(),
  getInstitutionCodeList: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/safe-error-log', () => ({ logErrorSafely: vi.fn() }));
vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: {
    getAdministCodeList: mocks.getAdministCodeList,
    getInstitutionCodeList: mocks.getInstitutionCodeList,
  },
}));
vi.mock('../administ/AdministCodeClient', () => ({ default: () => null }));
vi.mock('../institution/InstitutionCodeClient', () => ({ default: () => null }));

const { default: AdministCodePage } = await import('../administ/page');
const { default: InstitutionCodePage } = await import('../institution/page');

type Tree = ReactElement<{ children: ReactElement<{ children: ReactElement<{ initialData: unknown }> }> }>;

/** 바깥 div → Suspense → 클라이언트 요소가 받은 initialData. */
async function initialDataProp(page: () => Promise<unknown>) {
  const element = await page();
  expect(isValidElement(element)).toBe(true);
  return (element as Tree).props.children.props.children.props.initialData;
}

describe.each([
  ['행정 구역 코드', AdministCodePage, mocks.getAdministCodeList],
  ['기관 코드', InstitutionCodePage, mocks.getInstitutionCodeList],
])('%s 라우트 — 서버 선조회', (_label, Page, fetchList) => {
  it('선조회가 실패하면 빈 페이지가 아니라 null 을 넘긴다 — 실패를 확인된 0건과 섞지 않는다', async () => {
    fetchList.mockRejectedValueOnce(new Error('조회 실패'));
    await expect(initialDataProp(Page)).resolves.toBeNull();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('선조회가 성공하면 비어 있어도 받은 첫 페이지를 그대로 넘긴다', async () => {
    const empty = { list: [], total: 0, page: 1, size: 10, totalPage: 0 };
    fetchList.mockResolvedValueOnce(empty);
    await expect(initialDataProp(Page)).resolves.toBe(empty);
  });
});
