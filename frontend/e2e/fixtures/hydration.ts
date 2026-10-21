import { expect, type Locator } from '@playwright/test';

/**
 * 서버가 그린 요소는 하이드레이션 전에도 보이고 입력도 받지만 React 는 그 입력을 모른다 — 제어 입력이면 하이드레이션 때
 * 자기 상태 값으로 되돌린다(2026-10-21 GAP-FE-003, 통계 기간 입력). 제목이 보인 것은 본문이 하이드레이션됐다는 뜻이
 * 아니므로, 조작할 요소를 React 가 맡았는지(React DOM 이 붙이는 `__reactFiber$` 표지)를 본 뒤에 조작한다.
 */
export async function waitForHydration(locator: Locator): Promise<void> {
  await expect.poll(
    () => locator.evaluate(element => Object.keys(element).some(key => key.startsWith('__reactFiber$'))),
    { message: '요소를 React 가 아직 하이드레이션하지 않았다', timeout: 20_000 },
  ).toBe(true);
}
