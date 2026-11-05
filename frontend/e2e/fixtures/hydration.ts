import { expect, type Locator, type Page, type Request } from '@playwright/test';

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

/**
 * 화면을 떠나기 전에 그 화면이 보낸 `/api` 요청이 끝나기를 기다린다. 오류 감시는 이동으로 끊긴 `/api` XHR·fetch 를
 * 결함으로 본다(error-detector — 실제 업무 요청의 유실과 가를 수 없어서다).
 *
 * [2026-11-05] 서버가 그린 내용만 확인하고 바로 다음 화면으로 가면, 평소에는 하이드레이션 전에 떠나 끊길 요청이 없다. 그런데
 *   기계가 바쁘면 그 사이 하이드레이션된 화면이 막 보낸 `/api/v1/auth/me` 가 이동에 끊겼다(Oracle 19c 대표 E2E,
 *   board-articles 의 공지·FAQ 차단 시험). `networkidle` 은 한 번만 오는 상태라 늦은 하이드레이션보다 먼저 지나갈 수 있어
 *   이 경합을 막지 못한다.
 * 이동 전에 추적을 시작하고, 떠나기 전에 `settled` 로 하이드레이션을 확인한 뒤 진행 중인 `/api` 요청이 없는 상태가
 * 하이드레이션 확인 뒤로 `quietMs` 동안 이어지기를 기다린다. 하이드레이션 직후 마운트 effect 가 보내는 요청도 그 창 안에서 잡힌다.
 */
export function trackApiRequests(page: Page): { settled: (hydrated: Locator, quietMs?: number) => Promise<void> } {
  const pending = new Set<Request>();
  let lastChange = Date.now();
  const isApi = (request: Request) => /\/api\//.test(request.url()) && ['xhr', 'fetch'].includes(request.resourceType());
  const started = (request: Request) => {
    if (!isApi(request)) return;
    pending.add(request);
    lastChange = Date.now();
  };
  const ended = (request: Request) => {
    if (pending.delete(request)) lastChange = Date.now();
  };
  page.on('request', started);
  page.on('requestfinished', ended);
  page.on('requestfailed', ended);
  return {
    async settled(hydrated, quietMs = 500) {
      try {
        await waitForHydration(hydrated);
        // 조용한 시간은 하이드레이션을 확인한 뒤부터 센다. 그 전의 정적은 마운트 effect 가 아직 요청을 보내지 않은 시간일 수 있다.
        const hydratedAt = Date.now();
        await expect.poll(
          () => pending.size === 0 && Date.now() - Math.max(lastChange, hydratedAt) >= quietMs,
          { message: `화면의 /api 요청이 ${quietMs}ms 동안 조용해지지 않았다`, timeout: 20_000, intervals: [100] },
        ).toBe(true);
      } finally {
        page.off('request', started);
        page.off('requestfinished', ended);
        page.off('requestfailed', ended);
      }
    },
  };
}
