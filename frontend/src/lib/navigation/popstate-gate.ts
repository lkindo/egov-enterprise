/**
 * 뒤로·앞으로 가기(popstate) 문지기 — 미저장 변경 확인(UnsavedChangesContext)이 Next App Router 보다 먼저 판정하게 한다.
 *
 * [2026-10-03] 브라우저는 window 의 popstate 처리기를 등록 순서대로 불렀다(격리 e2e 실측: Chrome 이 캡처 여부와 관계없이
 * 먼저 등록된 처리기를 먼저 불렀다). Next 는 앱 로딩 직후 React effect 에서 처리기를 등록하고, 우리 provider 모듈은 그 뒤
 * 지연 청크에서 평가된다 — 그래서 provider 가 등록한 처리기는 늘 Next 뒤였다. 이전 화면이 캐시돼 있으면 Next 가 화면을
 * 동기로 바꿔 저장하지 않은 편집이 확인 없이 사라졌다(같은 화면 안의 hash 뒤로 가기만 우연히 보호됐다).
 *
 * 그래서 문지기 하나를 루트 레이아웃의 nonce 인라인 스크립트로 앱 번들보다 먼저 등록하고, 판정은 마운트된 provider 가
 * `window[POPSTATE_GATE_KEY]` 에 꽂은 함수가 한다. 판정이 막으면 그 함수가 event.stopImmediatePropagation() 을 불러 뒤
 * 처리기(Next 포함)를 멈춘다. 이 파일은 'use client' 가 아니다 — 서버 레이아웃이 문자열 값을 그대로 쓴다.
 */
export const POPSTATE_GATE_KEY = '__egovPopstateGate';
export const POPSTATE_GATE_INSTALLED_KEY = '__egovPopstateGateInstalled';

/** 레이아웃 인라인 스크립트 본문. 정적 문자열이다(요청 값이 섞이지 않는다). */
export const POPSTATE_GATE_SCRIPT =
  `(function(w){if(w.${POPSTATE_GATE_INSTALLED_KEY})return;w.${POPSTATE_GATE_INSTALLED_KEY}=true;`
  + `w.addEventListener('popstate',function(e){var g=w.${POPSTATE_GATE_KEY};if(typeof g==='function')g(e);},true);})(window);`;

type GateWindow = Window & { [POPSTATE_GATE_KEY]?: (event: PopStateEvent) => void; [POPSTATE_GATE_INSTALLED_KEY]?: boolean };

/** 문지기를 아직 등록하지 않은 환경(레이아웃 밖 테스트 등)에서 같은 문지기를 등록한다. 두 번 등록하지 않는다. */
export function ensurePopstateGate(): void {
  if (typeof window === 'undefined') return;
  const target = window as GateWindow;
  if (target[POPSTATE_GATE_INSTALLED_KEY]) return;
  target[POPSTATE_GATE_INSTALLED_KEY] = true;
  window.addEventListener('popstate', (event) => target[POPSTATE_GATE_KEY]?.(event), true);
}

/** 판정 함수를 꽂는다. 반환값으로 꽂은 함수만 뺀다(다른 provider 가 바꿔 꽂았으면 건드리지 않는다). */
export function setPopstateGate(handler: (event: PopStateEvent) => void): () => void {
  const target = window as GateWindow;
  target[POPSTATE_GATE_KEY] = handler;
  return () => { if (target[POPSTATE_GATE_KEY] === handler) delete target[POPSTATE_GATE_KEY]; };
}
