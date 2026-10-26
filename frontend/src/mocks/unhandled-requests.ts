import type { SetupServerApi } from 'msw/node';

/*
 * [2026-10-26] 핸들러 없는 요청을 모아 시험 실패로 올린다. onUnhandledRequest: 'error' 는 요청을 막고 로그만 남기므로, 앱 코드가
 * 실패를 삼키면 시험은 그대로 통과한다 — 모은 요청이 있으면 시험이 끝날 때 던진다(vitest.setup.ts).
 */
const pending: string[] = [];
const watched = new WeakSet<SetupServerApi>();

export function watchUnhandledRequests(server: SetupServerApi): void {
  if (watched.has(server)) return;
  watched.add(server);
  server.events.on('request:unhandled', ({ request }) => {
    // 어느 시험에서 나간 요청인지 함께 적는다 — 늦게 기록된 요청이 다음 시험에서 드러나도 출처를 찾을 수 있다.
    const source = (globalThis as { expect?: { getState?: () => { currentTestName?: string } } }).expect?.getState?.().currentTestName;
    pending.push(`${request.method} ${request.url}${source ? ` (시험: ${source})` : ''}`);
  });
}

/** 모은 요청을 비우며 돌려준다(같은 요청은 한 번). */
export function takeUnhandledRequests(): string[] {
  return [...new Set(pending.splice(0))];
}

export function assertNoUnhandledRequests(): void {
  const seen = takeUnhandledRequests();
  if (seen.length === 0) return;
  throw new Error(`MSW 핸들러 없는 요청: ${seen.join(', ')} — src/mocks/handlers.ts 에 핸들러를 두거나, 실제 요청이 필요하면 `
    + 'server.use(http.X(url, () => passthrough())) 로 밝히세요.');
}
