import { describe, expect, it, vi } from 'vitest';
import type { Locator, Page, Request } from '@playwright/test';

// Playwright 의 expect.poll 은 시험 실행기 밖에서 쓰지 않는다. 같은 뜻(값이 기대와 같아질 때까지 짧게 되묻기)만 흉내 낸다.
vi.mock('@playwright/test', () => ({
  expect: {
    poll: (probe: () => unknown, options?: { timeout?: number; message?: string }) => ({
      toBe: async (expected: unknown) => {
        const deadline = Date.now() + (options?.timeout ?? 1_000);
        for (;;) {
          if (await probe() === expected) return;
          if (Date.now() > deadline) throw new Error(options?.message ?? 'poll timeout');
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      },
    }),
  },
}));

const { trackApiRequests } = await import('./hydration');

type Listener = (request: Request) => void;
function fakePage() {
  const listeners = new Map<string, Set<Listener>>();
  const page = {
    on: (event: string, listener: Listener) => { (listeners.get(event) ?? listeners.set(event, new Set()).get(event)!).add(listener); return page; },
    off: (event: string, listener: Listener) => { listeners.get(event)?.delete(listener); return page; },
  };
  const emit = (event: string, request: Request) => listeners.get(event)?.forEach(listener => listener(request));
  const listening = () => [...listeners.values()].reduce((count, set) => count + set.size, 0);
  return { page: page as unknown as Page, emit, listening };
}
const request = (url: string, resourceType = 'xhr') => ({ url: () => url, resourceType: () => resourceType }) as unknown as Request;
const hydrated = { evaluate: async (probe: (element: object) => boolean) => probe({ __reactFiber$abc: {} }) } as unknown as Locator;
const resolvedWithin = (promise: Promise<unknown>, ms: number) =>
  Promise.race([promise.then(() => true), new Promise<boolean>(resolve => setTimeout(() => resolve(false), ms))]);

/**
 * [2026-11-05] 목록을 떠날 때 하이드레이션 중 나간 /api 요청이 이동에 끊기던 경합(board-articles 공지·FAQ 차단 시험)을 막는 도우미다.
 * 진행 중인 /api 요청이 있는 동안 끝나지 않아야 그 경합을 막는다.
 */
describe('trackApiRequests', () => {
  it('진행 중인 /api 요청이 끝나고 조용한 시간이 지난 뒤에야 끝난다', async () => {
    const { page, emit } = fakePage();
    const tracker = trackApiRequests(page);
    const authMe = request('http://127.0.0.1:3000/api/v1/auth/me');
    emit('request', authMe);
    const settled = tracker.settled(hydrated, 50);
    expect(await resolvedWithin(settled, 200)).toBe(false);
    emit('requestfinished', authMe);
    expect(await resolvedWithin(settled, 1_000)).toBe(true);
  });

  it('늦게 하이드레이션돼도 조용한 시간을 그 뒤부터 센다 — 마운트 직후의 요청을 놓치지 않는다', async () => {
    // 독립 검토 반례: 추적 시작 뒤 요청 없이 시간이 흐른 다음 하이드레이션되면, 그 전의 정적을 조용한 시간으로 세어 즉시 끝났다.
    const { page, emit } = fakePage();
    const tracker = trackApiRequests(page);
    let isHydrated = false;
    const late = { evaluate: async (probe: (element: object) => boolean) => probe(isHydrated ? { __reactFiber$abc: {} } : {}) } as unknown as Locator;
    const settled = tracker.settled(late, 150);
    await new Promise(resolve => setTimeout(resolve, 300));
    isHydrated = true;
    await new Promise(resolve => setTimeout(resolve, 60));
    const authMe = request('http://127.0.0.1:3000/api/v1/auth/me');
    emit('request', authMe);
    expect(await resolvedWithin(settled, 200)).toBe(false);
    emit('requestfinished', authMe);
    expect(await resolvedWithin(settled, 1_000)).toBe(true);
  });

  it('요청이 끝난 뒤에도 조용한 시간을 다시 채운다 — 끝난 직후 이어지는 요청을 놓치지 않는다', async () => {
    // 독립 검토 반례: 요청 종료 때 시각을 갱신하지 않아도 '1초 안에 끝남' 만 보던 시험은 통과했다. 요청이 조용한 시간보다 오래
    //   걸리면, 갱신이 없을 때 종료 즉시 끝나 버린다 — 응답을 받은 화면이 곧바로 보내는 다음 요청이 그 사이에 끊긴다.
    const { page, emit } = fakePage();
    const tracker = trackApiRequests(page);
    const authMe = request('http://127.0.0.1:3000/api/v1/auth/me');
    emit('request', authMe);
    const settled = tracker.settled(hydrated, 150);
    await new Promise(resolve => setTimeout(resolve, 300));
    emit('requestfinished', authMe);
    expect(await resolvedWithin(settled, 80)).toBe(false);
    expect(await resolvedWithin(settled, 1_000)).toBe(true);
  });

  it('끊긴 요청도 끝난 것으로 센다 — 기다림이 영원히 걸리지 않는다', async () => {
    const { page, emit } = fakePage();
    const tracker = trackApiRequests(page);
    const notifications = request('http://127.0.0.1:3000/api/v1/notifications', 'fetch');
    emit('request', notifications);
    const settled = tracker.settled(hydrated, 50);
    emit('requestfailed', notifications);
    expect(await resolvedWithin(settled, 1_000)).toBe(true);
  });

  it('/api 가 아닌 요청(문서·스크립트·화면 prefetch)은 기다리지 않는다 — 오류 감시도 그 취소를 결함으로 보지 않는다', async () => {
    const { page, emit } = fakePage();
    const tracker = trackApiRequests(page);
    emit('request', request('http://127.0.0.1:3000/_next/static/chunks/app.js', 'script'));
    emit('request', request('http://127.0.0.1:3000/admin/work-hub?_rsc=abc', 'fetch'));
    emit('request', request('http://127.0.0.1:3000/api/v1/menus/head', 'document'));
    expect(await resolvedWithin(tracker.settled(hydrated, 50), 1_000)).toBe(true);
  });

  it('끝나면 듣던 이벤트를 모두 뗀다', async () => {
    const { page, listening } = fakePage();
    const tracker = trackApiRequests(page);
    expect(listening()).toBe(3);
    await tracker.settled(hydrated, 10);
    expect(listening()).toBe(0);
  });
});
