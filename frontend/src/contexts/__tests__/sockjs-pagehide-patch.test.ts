/**
 * sockjs-client 의 페이지 이탈 감지 패치(frontend/patches/sockjs-client@1.6.1.patch).
 *
 * sockjs-client 1.6.1(마지막 판)은 모듈을 불러올 때 window 에 'unload' 리스너를 건다. Chromium 은 'unload' 를 걷고 있어
 * 159 부터 기본 권한 정책이 막는다 — 리스너는 불리지 않고, 거는 순간 "Permissions policy violation: unload is not
 * allowed in this document." 콘솔 오류가 난다(E2E 오류 감시가 이것으로 붉었다). 패치는 같은 뜻의 'pagehide'
 * (persisted=false — 페이지가 정말 떠날 때)로 바꾼다.
 *
 * 설치된 모듈 파일을 새 vm 문맥에서 평가한다. 모듈은 상태(afterUnload)를 들고, vitest 는 node_modules 의 CommonJS 를
 * 다시 불러오지 않으므로 시험마다 새로 평가해야 서로 영향이 없다.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const sockjsPackage = require('sockjs-client/package.json') as { version: string };
const eventModulePath = require.resolve('sockjs-client/lib/utils/event.js');
const frontendPackage = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  pnpm?: { patchedDependencies?: Record<string, string> };
};

type EventUtils = {
  unloadAdd: (listener: () => void) => string | null;
  triggerUnloadCallbacks: () => void;
};

/** 모듈을 새 문맥에서 평가한다. 창은 이벤트 대상 하나로 흉내 내고, 걸린 리스너의 이벤트 이름을 모은다. */
function loadEventUtils() {
  const window = new EventTarget();
  const registered: string[] = [];
  const addEventListener = window.addEventListener.bind(window);
  Object.assign(window, {
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean) => {
      registered.push(type);
      addEventListener(type, listener, options);
    },
  });
  const module = { exports: {} as EventUtils };
  const localRequire = (request: string) => (request === './random' ? { string: () => Math.random().toString(36).slice(2, 10) } : require(request));
  runInNewContext(readFileSync(eventModulePath, 'utf8'), {
    module, exports: module.exports, require: localRequire, global: window, setTimeout,
  });
  const pagehide = (persisted: boolean) => window.dispatchEvent(Object.assign(new Event('pagehide'), { persisted }));
  return { utils: module.exports, registered, pagehide };
}

describe('sockjs-client 페이지 이탈 패치', () => {
  it('설치된 sockjs-client 판에 패치가 걸려 있다(판이 바뀌면 패치도 다시 만든다)', () => {
    expect(frontendPackage.pnpm?.patchedDependencies?.[`sockjs-client@${sockjsPackage.version}`])
      .toBe(`patches/sockjs-client@${sockjsPackage.version}.patch`);
  });

  it("'unload' 대신 'pagehide' 리스너를 건다", () => {
    const { registered } = loadEventUtils();
    expect(registered).toEqual(['pagehide']);
  });

  it('페이지가 정말 떠나면(persisted=false) 열린 연결의 정리 콜백을 부른다', () => {
    const { utils, pagehide } = loadEventUtils();
    const cleanup = vi.fn();
    utils.unloadAdd(cleanup);
    pagehide(false);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('뒤로·앞으로 캐시로 들어가면(persisted=true) 정리하지 않고, 돌아온 뒤 새 연결도 바로 닫지 않는다', async () => {
    const { utils, pagehide } = loadEventUtils();
    const before = vi.fn();
    utils.unloadAdd(before);
    pagehide(true);
    expect(before).not.toHaveBeenCalled();
    // 패치가 persisted 를 보지 않으면 afterUnload 가 켜진 채 남아, 이후 unloadAdd 가 다음 차례에 곧바로 콜백을 부른다.
    const after = vi.fn();
    utils.unloadAdd(after);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(after).not.toHaveBeenCalled();
  });
});
