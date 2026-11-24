import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
      url: 'http://localhost:3001/api/v1/admin/system/users?page=1',
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

  it('minOccurrences가 0인 항목은 발생하지 않아도 위반으로 처리되지 않는다', () => {
    const ledger = new ExpectedErrorLedger(scope, now);
    ledger.register(responseEntry({ minOccurrences: 0 }));

    expect(ledger.violations()).toEqual([]);
  });

  it('minOccurrences 기본값(1)인 항목은 미발생 시 위반으로 처리된다', () => {
    const ledger = new ExpectedErrorLedger(scope, now);
    ledger.register(responseEntry());

    expect(ledger.violations()).toEqual([
      expect.stringContaining('[EXPECTED ERROR 미발생]'),
    ]);
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
      request: () => ({ method: () => 'GET', resourceType: () => 'fetch', isNavigationRequest: () => false }),
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

    // `_rsc=` 가 없어도 문서 요청 및 비-API 화면 라우트의 fetch 취소는 통과한다(라우터의 prefetch·대체된 탐색).
    const documentAbort = await makeGuard();
    abort(documentAbort.listeners,
      'http://localhost:3001/admin/community/boards/detail?bbsId=BBSMSTR_A&pstSn=4',
      { resourceType: 'document' });
    await expect(documentAbort.guard.verify()).resolves.toBeUndefined();

    const pageFetchAbort = await makeGuard();
    abort(pageFetchAbort.listeners,
      'http://localhost:3001/admin/community/boards/detail?bbsId=BBSMSTR_A&pstSn=4',
      { resourceType: 'fetch' });
    await expect(pageFetchAbort.guard.verify()).resolves.toBeUndefined();

    // `/api/` 비즈니스 요청의 fetch/XHR 취소는 결함으로 남는다.
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

  // Playwright 1.65 는 새 문서가 커밋될 때 이전 문서의 진행 중 요청을 한꺼번에 ERR_ABORTED 로 보고한 뒤 framenavigated 를
  // 낸다(1.64 는 보고하지 않았다). 순서는 새 문서 응답 → 실패 묶음 → framenavigated 다. 그 묶음 안의 읽기만 통과하고,
  // 앱이 스스로 취소한 업무 API·쓰기 중단·리다이렉트나 다운로드·204 를 기다리던 중의 취소·끼어든 사건 뒤의 취소·같은 문서
  // 안 이동 직전의 취소는 계속 결함이어야 한다(2026-11-24 독립 검토 두 차례의 반례 포함).
  describe('새 문서 커밋으로 끊긴 이전 문서의 읽기 요청', () => {
    type FakeFrame = { name: string; href: string; url: () => string };
    type FakeRequest = Record<string, () => unknown>;
    const frame = (name: string): FakeFrame => {
      const fake: FakeFrame = { name, href: 'http://localhost:3001/admin/user/manage', url: () => fake.href };
      return fake;
    };
    const bookmarks = 'http://localhost:3001/api/v1/menus/bookmarks/status';
    const abortedGetEntry = responseEntry({
      id: 'E2E-RESILIENCE-ABORTED-GET',
      channel: 'requestfailed',
      urlPattern: /\/api\/v1\/menus\/bookmarks\/status$/,
      messagePattern: /^net::ERR_ABORTED$/,
      method: 'GET',
      status: null,
      reason: '앱이 메뉴 조회를 AbortSignal 로 취소하는 반례다.',
    });

    const makeGuard = async () => {
      const mainFrame = frame('main');
      const childFrame = frame('child');
      let clockMs = now().getTime();
      const listeners = new Map<string, (value: unknown) => void>();
      const page = {
        on: (event: string, listener: (value: unknown) => void) => {
          listeners.set(event, listener);
          return page;
        },
        url: () => mainFrame.href,
        mainFrame: () => mainFrame,
      } as unknown as Page;
      const guard = new (await import('./error-detector')).ConsoleErrorGuard(page, scope, () => new Date(clockMs));
      await guard.install();
      const emit = (event: string, value: unknown) => listeners.get(event)?.(value);
      const request = (url: string, method: string, target: FakeFrame, navigation = false, errorText = 'net::ERR_ABORTED'): FakeRequest => ({
        url: () => url,
        method: () => method,
        resourceType: () => (navigation ? 'document' : 'xhr'),
        failure: () => ({ errorText }),
        isNavigationRequest: () => navigation,
        frame: () => target,
      });
      return {
        guard,
        mainFrame,
        childFrame,
        advance: (ms: number) => { clockMs += ms; },
        /** 문서 탐색 요청. 요청·응답·실패에 같은 객체를 쓴다. */
        navigation: (target: FakeFrame = mainFrame) => request('http://localhost:3001/admin/system/menus', 'GET', target, true),
        navigationRequest: (navigation: FakeRequest) => emit('request', navigation),
        navigationResponse: (navigation: FakeRequest, status = 200) => emit('response', {
          status: () => status,
          url: () => navigation.url(),
          request: () => navigation,
        }),
        /** 응답을 받은 탐색이 다운로드·204 로 끝났거나 다른 탐색에 밀려 탐색 요청 자체가 실패했다. */
        navigationFailed: (navigation: FakeRequest) => emit('requestfailed', navigation),
        /** framenavigated. 주소가 바뀌지 않으면 같은 문서 안 이동(pushState)과 구별되지 않는다. */
        commit: (target: FakeFrame = mainFrame, href = target.href) => {
          target.href = href;
          emit('framenavigated', target);
        },
        apiFailure: ({ target = mainFrame, method = 'GET', url = bookmarks, errorText = 'net::ERR_ABORTED' } = {}) =>
          emit('requestfailed', request(url, method, target, false, errorText)),
        /** 같은 프레임의 다른 네트워크 사건. */
        sameFrameEvent: (event: 'request' | 'requestfinished' | 'response', target: FakeFrame = mainFrame) => {
          const other = request('http://localhost:3001/api/v1/notifications', 'GET', target);
          emit(event, event === 'response' ? { status: () => 200, url: other.url, request: () => other } : other);
        },
      };
    };
    const errorCount = async (guard: { verify: () => Promise<void> }) => {
      try {
        await guard.verify();
        return 0;
      } catch (error) {
        return Number(/Detected (\d+) browser errors/.exec(String((error as Error).message))?.[1] ?? NaN);
      }
    };
    let consoleError: ReturnType<typeof vi.spyOn>;
    beforeEach(() => { consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined); });
    afterEach(() => consoleError.mockRestore());

    it('새 문서 응답과 커밋 사이 실패 묶음의 GET·HEAD 는 통과한다', async () => {
      for (const method of ['GET', 'HEAD']) {
        const replaced = await makeGuard();
        replaced.navigationResponse(replaced.navigation());
        replaced.apiFailure({ method });
        replaced.apiFailure({ method, url: 'http://localhost:3001/api/v1/notifications/unread-count' });
        replaced.commit(replaced.mainFrame, 'http://localhost:3001/admin/system/menus');
        await expect(replaced.guard.verify()).resolves.toBeUndefined();
      }
    });

    it('리다이렉트를 거친 문서 교체와 응답 없는 문서(about:blank)로의 교체 묶음도 통과한다', async () => {
      const redirected = await makeGuard();
      const first = redirected.navigation();
      redirected.navigationRequest(first);
      redirected.navigationResponse(first, 302);
      const final = redirected.navigation();
      redirected.navigationRequest(final);
      redirected.navigationResponse(final);
      redirected.apiFailure();
      redirected.commit(redirected.mainFrame, 'http://localhost:3001/login');
      await expect(redirected.guard.verify()).resolves.toBeUndefined();

      const blank = await makeGuard();
      blank.apiFailure();
      blank.commit(blank.mainFrame, 'about:blank');
      await expect(blank.guard.verify()).resolves.toBeUndefined();
    });

    it('기다리던 탐색이 아닌 다른 탐색의 실패(연속 이동)는 커밋 대기를 닫지 않는다', async () => {
      const consecutive = await makeGuard();
      const first = consecutive.navigation();
      const second = consecutive.navigation();
      consecutive.navigationResponse(second);
      consecutive.navigationFailed(first);
      consecutive.apiFailure();
      consecutive.commit(consecutive.mainFrame, 'http://localhost:3001/admin/system/menus');
      await expect(consecutive.guard.verify()).resolves.toBeUndefined();
    });

    it('탐색 없이 끊긴 업무 API(앱의 AbortSignal 취소)는 잡는다 — 뒤이은 같은 문서 안 이동도 덮지 못한다', async () => {
      const appAbort = await makeGuard();
      appAbort.apiFailure();
      await expect(appAbort.guard.verify()).rejects.toThrow(/NETWORK FAILED.*bookmarks\/status \(xhr\)/);

      const beforePushState = await makeGuard();
      beforePushState.apiFailure();
      beforePushState.commit(beforePushState.mainFrame, 'http://localhost:3001/admin/user/manage?page=2');
      await expect(beforePushState.guard.verify()).rejects.toThrow(/NETWORK FAILED.*bookmarks\/status/);
    });

    it('실패 묶음 안이어도 쓰기 요청의 중단은 잡고 읽기는 통과한다', async () => {
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const write = await makeGuard();
        write.navigationResponse(write.navigation());
        write.apiFailure();
        write.apiFailure({ method, url: 'http://localhost:3001/api/v1/approvals/temporary-drafts' });
        write.commit();
        await expect(write.guard.verify()).rejects.toThrow(/temporary-drafts/);
        expect(await errorCount(write.guard)).toBe(1);
      }
    });

    it('리다이렉트 응답만 받은 동안 끊긴 읽기는 뒤이은 같은 문서 안 이동이 덮지 못한다', async () => {
      const redirect = await makeGuard();
      const first = redirect.navigation();
      redirect.navigationResponse(first, 302);
      const final = redirect.navigation();
      redirect.navigationRequest(final);
      redirect.apiFailure();
      redirect.commit(redirect.mainFrame, 'http://localhost:3001/admin/user/manage?tab=2');
      redirect.navigationResponse(final);
      redirect.commit(redirect.mainFrame, 'http://localhost:3001/admin/system/menus');
      await expect(redirect.guard.verify()).rejects.toThrow(/NETWORK FAILED.*bookmarks\/status/);
      expect(await errorCount(redirect.guard)).toBe(1);
    });

    it('응답을 받은 탐색이 다운로드·204 로 끝나면 그 전에 보류한 취소를 잡고, 뒤이은 같은 문서 안 이동도 덮지 못한다', async () => {
      const noCommit = await makeGuard();
      const navigation = noCommit.navigation();
      noCommit.navigationResponse(navigation, 204);
      noCommit.apiFailure();
      noCommit.navigationFailed(navigation);
      noCommit.commit(noCommit.mainFrame, 'http://localhost:3001/admin/user/manage?tab=2');
      await expect(noCommit.guard.verify()).rejects.toThrow(/NETWORK FAILED.*bookmarks\/status/);
      expect(await errorCount(noCommit.guard)).toBe(1);
    });

    it('보류한 취소와 커밋 사이에 같은 프레임의 네트워크 사건이 끼면 그 취소는 잡는다', async () => {
      for (const event of ['request', 'requestfinished', 'response'] as const) {
        const interrupted = await makeGuard();
        interrupted.navigationResponse(interrupted.navigation());
        interrupted.apiFailure();
        interrupted.sameFrameEvent(event);
        interrupted.apiFailure({ url: 'http://localhost:3001/api/v1/notifications/unread-count' });
        interrupted.commit();
        await expect(interrupted.guard.verify()).rejects.toThrow(/NETWORK FAILED.*bookmarks\/status/);
        expect(await errorCount(interrupted.guard)).toBe(1);
      }
      // 다른 프레임의 사건은 끼어든 것으로 보지 않는다.
      const otherFrameEvent = await makeGuard();
      otherFrameEvent.navigationResponse(otherFrameEvent.navigation());
      otherFrameEvent.apiFailure();
      otherFrameEvent.sameFrameEvent('request', otherFrameEvent.childFrame);
      otherFrameEvent.commit();
      await expect(otherFrameEvent.guard.verify()).resolves.toBeUndefined();
    });

    it('응답 없는 문서로의 커밋보다 한참 먼저 끊긴 취소는 묶음이 아니다', async () => {
      const idle = await makeGuard();
      idle.apiFailure();
      idle.advance(1000);
      idle.commit(idle.mainFrame, 'about:blank');
      await expect(idle.guard.verify()).rejects.toThrow(/NETWORK FAILED.*bookmarks\/status/);
    });

    it('커밋 뒤·다른 프레임·커밋 없이 끝난 취소와 취소가 아닌 실패는 잡는다', async () => {
      const afterCommit = await makeGuard();
      afterCommit.navigationResponse(afterCommit.navigation());
      afterCommit.commit();
      afterCommit.apiFailure();
      await expect(afterCommit.guard.verify()).rejects.toThrow(/NETWORK FAILED/);

      const otherFrame = await makeGuard();
      otherFrame.navigationResponse(otherFrame.navigation(otherFrame.childFrame));
      otherFrame.apiFailure({ target: otherFrame.mainFrame });
      otherFrame.commit(otherFrame.childFrame);
      await expect(otherFrame.guard.verify()).rejects.toThrow(/NETWORK FAILED/);

      const neverCommitted = await makeGuard();
      neverCommitted.navigationResponse(neverCommitted.navigation());
      neverCommitted.apiFailure();
      await expect(neverCommitted.guard.verify()).rejects.toThrow(/NETWORK FAILED/);

      const refused = await makeGuard();
      refused.navigationResponse(refused.navigation());
      refused.apiFailure({ errorText: 'net::ERR_CONNECTION_REFUSED' });
      refused.commit();
      await expect(refused.guard.verify()).rejects.toThrow(/ERR_CONNECTION_REFUSED/);
    });

    it('앱의 취소로 확정된 보류분은 ledger 로 세고, 실패 묶음의 읽기는 ledger 를 채우지 않는다', async () => {
      const settled = await makeGuard();
      settled.guard.expectErrors([abortedGetEntry]);
      const navigation = settled.navigation();
      settled.navigationResponse(navigation, 204);
      settled.apiFailure();
      settled.navigationFailed(navigation);
      await expect(settled.guard.verify()).resolves.toBeUndefined();

      const replaced = await makeGuard();
      replaced.guard.expectErrors([abortedGetEntry]);
      replaced.navigationResponse(replaced.navigation());
      replaced.apiFailure();
      replaced.commit();
      await expect(replaced.guard.verify()).rejects.toThrow(/EXPECTED ERROR 미발생\] E2E-RESILIENCE-ABORTED-GET/);
    });
  });

  it('spec ledger ID는 저장소에서 유일하고 legacy ignore API를 사용하지 않는다', () => {
    const e2eDirectory = path.resolve(process.cwd(), 'e2e');
    const specSources = fs.readdirSync(e2eDirectory, { recursive: true, encoding: 'utf8' })
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
