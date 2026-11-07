import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement } from 'react';

/**
 * 포상 화면 라우트가 서버 선조회 결과를 클라이언트에 넘기는 방식.
 *
 * [2026-11-08 화면 용어 원장 후속] 선조회가 실패하면 예전에는 빈 페이지(total 0)를 넘겼다. 클라이언트는 그것을 받은 값
 * (initialData)으로 써서 첫 화면이 "총 0건" 이 됐고, 오프라인이면 다시 조회하지 못해 그대로 남았다(실패를 '데이터 없음' 으로 말한다).
 * 이제 null 을 넘겨 클라이언트가 다시 조회하고, 실패하면 오류로 드러낸다.
 */
const mocks = vi.hoisted(() => ({ getRewardList: vi.fn() }));

vi.mock('@/services/foundation/operation/RewardAdminService', () => ({
  rewardAdminService: { getRewardList: mocks.getRewardList },
}));
vi.mock('../RewardManageClient', () => ({ default: () => null }));

const { default: RewardManagePage } = await import('../page');

/** Suspense 안의 클라이언트 요소가 받은 initialPage. */
async function initialPageProp() {
  const element = await RewardManagePage();
  expect(isValidElement(element)).toBe(true);
  const client = (element as ReactElement<{ children: ReactElement<{ initialPage: unknown }> }>).props.children;
  return client.props.initialPage;
}

describe('포상 화면 라우트 — 서버 선조회', () => {
  it('선조회가 실패하면 빈 페이지가 아니라 null 을 넘긴다 — 0건을 받은 값으로 위장하지 않는다', async () => {
    mocks.getRewardList.mockRejectedValueOnce(new Error('포상 조회 실패'));
    await expect(initialPageProp()).resolves.toBeNull();
  });

  it('선조회가 성공하면 받은 첫 페이지를 그대로 넘긴다', async () => {
    const page = { list: [], total: 12, page: 1, size: 10, totalPage: 2 };
    mocks.getRewardList.mockResolvedValueOnce(page);
    await expect(initialPageProp()).resolves.toBe(page);
    expect(mocks.getRewardList).toHaveBeenLastCalledWith({ page: 1, size: 10 });
  });
});
