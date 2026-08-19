import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ExpectedErrorLedger, type ExpectedErrorEntry } from './error-detector';

const scope = '21-advanced-resilience.spec.ts :: Network Resilience: API 500 Error Interception';
const now = () => new Date('2026-08-19T00:00:00.000Z');

function responseEntry(overrides: Partial<ExpectedErrorEntry> = {}): ExpectedErrorEntry {
  return {
    id: 'E2E-RESILIENCE-USERS-500',
    specScope: scope,
    channel: 'response',
    urlPattern: /\/api\/v1\/admin\/system\/users(?:\?|$)/,
    messagePattern: null,
    method: 'GET',
    status: 500,
    maxOccurrences: 1,
    reason: '이 테스트가 사용자 목록 API 500을 의도적으로 주입한다.',
    expiresAt: '2026-12-31',
    ...overrides,
  };
}

describe('ExpectedErrorLedger', () => {
  it('정확한 scope/url/method/status 이벤트만 소진한다', () => {
    const ledger = new ExpectedErrorLedger(scope, now);
    ledger.register(responseEntry());

    expect(ledger.consume({
      channel: 'response',
      url: 'http://localhost:3001/api/v1/admin/system/users?page=0',
      message: null,
      method: 'GET',
      status: 500,
    })).toBe(true);
    expect(ledger.violations()).toEqual([]);
  });

  it('미등록 오류는 소진하지 않는다', () => {
    const ledger = new ExpectedErrorLedger(scope, now);

    expect(ledger.consume({
      channel: 'response',
      url: 'http://localhost:3001/api/v1/admin/system/users',
      message: null,
      method: 'GET',
      status: 503,
    })).toBe(false);
  });

  it('등록됐지만 발생하지 않은 항목을 위반으로 보고한다', () => {
    const ledger = new ExpectedErrorLedger(scope, now);
    ledger.register(responseEntry());

    expect(ledger.violations()).toEqual([
      expect.stringContaining('E2E-RESILIENCE-USERS-500'),
    ]);
    expect(ledger.violations()[0]).toContain('미발생');
  });

  it('maxOccurrences를 넘긴 항목을 위반으로 보고한다', () => {
    const ledger = new ExpectedErrorLedger(scope, now);
    ledger.register(responseEntry());
    const event = {
      channel: 'response' as const,
      url: 'http://localhost:3001/api/v1/admin/system/users',
      message: null,
      method: 'GET',
      status: 500,
    };

    expect(ledger.consume(event)).toBe(true);
    expect(ledger.consume(event)).toBe(true);
    expect(ledger.violations()[0]).toContain('최대 1회');
  });

  it('만료된 항목은 등록 단계에서 거부한다', () => {
    const ledger = new ExpectedErrorLedger(scope, now);

    expect(() => ledger.register(responseEntry({ expiresAt: '2026-08-18' })))
      .toThrow(/만료/);
  });

  it('다른 spec scope의 항목은 등록 단계에서 거부한다', () => {
    const ledger = new ExpectedErrorLedger(scope, now);

    expect(() => ledger.register(responseEntry({ specScope: 'another.spec.ts :: 다른 테스트' })))
      .toThrow(/scope/);
  });

  it('미등록 HTTP 오류를 ConsoleErrorGuard 검증 실패로 올린다', async () => {
    const listeners = new Map<string, (value: unknown) => void>();
    const frame = {};
    const page = {
      on: (event: string, listener: (value: unknown) => void) => {
        listeners.set(event, listener);
        return page;
      },
      url: () => 'http://localhost:3001/admin/user/manage',
      mainFrame: () => frame,
    } as unknown as Page;
    const guard = new (await import('./error-detector')).ConsoleErrorGuard(page, scope);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await guard.install();

    listeners.get('response')?.({
      status: () => 503,
      url: () => 'http://localhost:3001/api/v1/admin/system/users',
      request: () => ({ method: () => 'GET', resourceType: () => 'fetch' }),
    });

    await expect(guard.verify()).rejects.toThrow(/HTTP 503 GET/);
    consoleError.mockRestore();
  });

  // 이 예외는 종전 구현에 있던 것을 복원한 것이다. 넓히면 실제 소켓 결함을 은폐하므로
  // '무엇을 통과시키는가'와 '무엇을 여전히 잡는가'를 함께 고정한다.
  it('SockJS teardown 경고만 통과시키고 다른 WebSocket 결함은 그대로 잡는다', async () => {
    const makeGuard = async () => {
      const listeners = new Map<string, (value: unknown) => void>();
      const frame = {};
      const page = {
        on: (event: string, listener: (value: unknown) => void) => {
          listeners.set(event, listener);
          return page;
        },
        url: () => 'http://localhost:3001/admin/user/manage',
        mainFrame: () => frame,
      } as unknown as Page;
      const guard = new (await import('./error-detector')).ConsoleErrorGuard(page, scope);
      await guard.install();
      return { guard, listeners };
    };
    const emit = (
      listeners: Map<string, (value: unknown) => void>,
      type: string,
      text: string,
    ) => listeners.get('console')?.({
      type: () => type,
      text: () => text,
      location: () => ({ url: 'http://localhost:3001/admin/user/manage' }),
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const teardown = await makeGuard();
    emit(teardown.listeners, 'warning',
      "WebSocket connection to 'ws://localhost:3001/ws/017/kyvvlyvz/websocket' failed: "
      + 'WebSocket is closed before the connection is established.');
    await expect(teardown.guard.verify()).resolves.toBeUndefined();

    // 같은 문구라도 error 채널이면 통과시키지 않는다.
    const asError = await makeGuard();
    emit(asError.listeners, 'error',
      "WebSocket connection to 'ws://localhost:3001/ws/017/kyvvlyvz/websocket' failed: "
      + 'WebSocket is closed before the connection is established.');
    await expect(asError.guard.verify()).rejects.toThrow(/WebSocket/);

    // 다른 원인의 소켓 실패는 여전히 결함이다.
    const otherFailure = await makeGuard();
    emit(otherFailure.listeners, 'warning',
      "WebSocket connection to 'ws://localhost:3001/ws/017/kyvvlyvz/websocket' failed: "
      + 'Unexpected response code: 500');
    await expect(otherFailure.guard.verify()).rejects.toThrow(/WebSocket/);

    consoleError.mockRestore();
  });

  // 종전 구현은 ERR_ABORTED 를 전부 무시했다. 여기서는 App Router 의 `_rsc=` prefetch 취소만
  // 통과시키므로, 그 경계가 유지되는지를 양방향으로 고정한다.
  it('RSC prefetch 취소만 통과시키고 다른 요청의 취소는 그대로 잡는다', async () => {
    const makeGuard = async () => {
      const listeners = new Map<string, (value: unknown) => void>();
      const frame = {};
      const page = {
        on: (event: string, listener: (value: unknown) => void) => {
          listeners.set(event, listener);
          return page;
        },
        url: () => 'http://localhost:3001/admin/community/boards',
        mainFrame: () => frame,
      } as unknown as Page;
      const guard = new (await import('./error-detector')).ConsoleErrorGuard(page, scope);
      await guard.install();
      return { guard, listeners };
    };
    const abort = (
      listeners: Map<string, (value: unknown) => void>,
      url: string,
      { errorText = 'net::ERR_ABORTED', resourceType = 'fetch' } = {},
    ) => listeners.get('requestfailed')?.({
      url: () => url,
      method: () => 'GET',
      resourceType: () => resourceType,
      failure: () => ({ errorText }),
      // 라우터의 문서 prefetch 는 '탐색 요청'이 아니다. 이 값이 false 인 상태에서도
      // 문서 취소가 통과해야 실제 CI 실패(03-board-community)를 재현·방지한다.
      isNavigationRequest: () => false,
      frame: () => ({}),
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const prefetch = await makeGuard();
    abort(prefetch.listeners,
      'http://localhost:3001/admin/community/boards/detail?bbsId=BBSMSTR_A&pstSn=1&_rsc=vi2dw7x3');
    await expect(prefetch.guard.verify()).resolves.toBeUndefined();

    // `_rsc=` 가 없어도 문서 요청의 취소는 통과한다(라우터의 문서 prefetch·대체된 탐색).
    const documentAbort = await makeGuard();
    abort(documentAbort.listeners,
      'http://localhost:3001/admin/community/boards/detail?bbsId=BBSMSTR_A&pstSn=4',
      { resourceType: 'document' });
    await expect(documentAbort.guard.verify()).resolves.toBeUndefined();

    // 같은 화면이라도 `_rsc=` 가 없는 fetch/XHR 취소는 결함으로 남는다.
    const apiAbort = await makeGuard();
    abort(apiAbort.listeners, 'http://localhost:3001/api/v1/boards/posts?bbsId=BBSMSTR_A');
    await expect(apiAbort.guard.verify()).rejects.toThrow(/NETWORK FAILED/);

    // prefetch URL이어도 취소가 아닌 실제 실패는 잡는다.
    const realFailure = await makeGuard();
    abort(realFailure.listeners,
      'http://localhost:3001/admin/community/boards/detail?_rsc=vi2dw7x3',
      { errorText: 'net::ERR_CONNECTION_REFUSED' });
    await expect(realFailure.guard.verify()).rejects.toThrow(/NETWORK FAILED/);

    // 문서 요청이어도 취소가 아닌 실패는 잡는다.
    const documentFailure = await makeGuard();
    abort(documentFailure.listeners, 'http://localhost:3001/admin/community/boards/detail',
      { errorText: 'net::ERR_CONNECTION_REFUSED', resourceType: 'document' });
    await expect(documentFailure.guard.verify()).rejects.toThrow(/NETWORK FAILED/);

    consoleError.mockRestore();
  });

  it('spec ledger ID는 저장소에서 유일하고 legacy ignore API를 사용하지 않는다', () => {
    const e2eDirectory = path.resolve(process.cwd(), 'e2e');
    const specSources = fs.readdirSync(e2eDirectory)
      .filter((fileName) => fileName.endsWith('.spec.ts'))
      .map((fileName) => ({
        fileName,
        source: fs.readFileSync(path.join(e2eDirectory, fileName), 'utf8'),
      }));
    const seen = new Map<string, string>();

    for (const { fileName, source } of specSources) {
      expect(source, `${fileName}에서 legacy addIgnorePattern을 다시 사용함`)
        .not.toMatch(/consoleGuard\.addIgnorePattern\s*\(/);
      for (const match of source.matchAll(/\bid:\s*['"](E2E-[A-Z0-9-]+)['"]/g)) {
        const id = match[1];
        expect(seen.get(id), `expected-error ID ${id} 중복: ${seen.get(id)} / ${fileName}`)
          .toBeUndefined();
        seen.set(id, fileName);
      }
    }

    expect(seen.size).toBeGreaterThan(0);
  });
});
