import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POPSTATE_GATE_INSTALLED_KEY, POPSTATE_GATE_KEY, POPSTATE_GATE_SCRIPT, setPopstateGate } from '../popstate-gate';

type GateWindow = Window & Record<string, unknown>;

/*
 * [2026-10-03] 뒤로 가기 미저장 확인은 Next 라우터보다 먼저 등록된 문지기를 거쳐야 한다. 레이아웃 인라인 스크립트가 그 문지기다.
 */
describe('popstate 문지기', () => {
  afterEach(() => { delete (window as unknown as GateWindow)[POPSTATE_GATE_KEY]; });

  it('인라인 스크립트는 한 번만 등록되고, 꽂힌 판정이 막으면 뒤에 등록된 처리기(Next 라우터)를 멈춘다', () => {
    // 같은 jsdom 창에서 이 파일만 문지기를 등록한다 — 두 번 실행해도 처리기는 하나다.
    new Function(POPSTATE_GATE_SCRIPT)();
    new Function(POPSTATE_GATE_SCRIPT)();
    expect((window as unknown as GateWindow)[POPSTATE_GATE_INSTALLED_KEY]).toBe(true);
    const router = vi.fn();
    window.addEventListener('popstate', router);
    try {
      const block = vi.fn((event: PopStateEvent) => event.stopImmediatePropagation());
      const release = setPopstateGate(block);
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
      expect(block).toHaveBeenCalledTimes(1);
      expect(router).not.toHaveBeenCalled();

      // 판정을 빼면 문지기는 아무것도 막지 않는다.
      release();
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
      expect(block).toHaveBeenCalledTimes(1);
      expect(router).toHaveBeenCalledTimes(1);
    } finally { window.removeEventListener('popstate', router); }
  });

  it('다른 provider 가 바꿔 꽂은 판정은 앞 provider 가 빠지며 지우지 않는다', () => {
    const first = vi.fn();
    const second = vi.fn();
    const releaseFirst = setPopstateGate(first);
    setPopstateGate(second);
    releaseFirst();
    expect((window as unknown as GateWindow)[POPSTATE_GATE_KEY]).toBe(second);
  });

  it('루트 레이아웃이 문지기를 요청 nonce 를 붙인 인라인 스크립트로 앱 번들보다 앞에 둔다', () => {
    const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    const script = layout.indexOf('<script nonce={nonce} dangerouslySetInnerHTML={{ __html: POPSTATE_GATE_SCRIPT }} />');
    expect(script).toBeGreaterThan(-1);
    // body 첫 자식이다 — 공급자·앱 트리(ProvidersWithAuth)보다 앞이다.
    expect(script).toBeLessThan(layout.indexOf('<ThemeProvider'));
    expect(script).toBeGreaterThan(layout.indexOf('<body'));
  });
});
