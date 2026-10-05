/**
 * 넓은 화면(lg 이상)의 사이드바 접기 — 서버 레이아웃과 클라이언트 훅이 함께 쓰는 상수(2026-10-05).
 *
 * 접힘은 `<html data-sidebar-collapsed="true">` 하나로 나타내고, 사이드바를 숨기고 그 자리에 좁은 막대(접힘 막대)를 보이며
 * 본문 여백을 막대 폭으로 돌리는 일은 globals.css 의 미디어쿼리(lg 이상)가 한다. lg 미만의 서랍형 사이드바는 이 속성과
 * 무관하다. 기본은 펼침이다.
 *
 * 상태는 이 브라우저에만 기억한다(개인 편의 — 서버·URL 에 싣지 않는다, PD-UX-002). 첫 화면에서 펼쳤다가 접히는 깜빡임과
 * 하이드레이션 불일치를 막으려고, 루트 레이아웃이 아래 스크립트를 요청 nonce 와 함께 본문보다 먼저 실행해 그리기 전에 속성을
 * 되살린다(테마 초기화·popstate 문지기와 같은 방식). `<html>` 은 suppressHydrationWarning 이라 서버 HTML 에 없던 이 속성이
 * 하이드레이션 경고를 내지 않고, React 는 자기가 소유하지 않은 속성을 지우지 않는다.
 *
 * 이 파일은 'use client' 가 아니다 — 서버 레이아웃이 문자열 값을 그대로 쓴다. 훅은 use-sidebar-collapsed.ts 에 있다.
 */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'egov.sidebar-collapsed.v1';
export const SIDEBAR_COLLAPSED_ATTRIBUTE = 'data-sidebar-collapsed';
/** 사이드바 `<aside>` 와 그 Suspense 자리표시가 함께 다는 표지 — 접힘 CSS 가 이 표지로 숨긴다. */
export const APP_SIDEBAR_MARKER = 'data-app-sidebar';
/**
 * 머리글 토글 단추의 고정 접근 이름. 상태(펼침·접힘)는 aria-expanded 로만 알린다 — 이름까지 바꾸면 스크린리더가 상태를 두 번
 * 말한다(APG disclosure). 음성 제어 사용자가 어느 쪽 동사로 불러도 이름 일부가 맞도록 두 동작을 모두 담는다.
 */
export const SIDEBAR_TOGGLE_LABEL = '사이드바 접기·펼치기';

/**
 * [2026-10-05 DEC-OPS-227] 머리글 아이콘 하나로는 접기를 찾지 못했다는 사용자 보고로 둔 두 단추. 둘 다 한 방향만 하므로
 * 그 방향을 이름으로 말하고, 같은 대상(사이드바)을 같은 말로 부른다(3.2.4). 사이드바 안 단추는 이 이름을 보이는 글자로
 * 그대로 그려 보이는 글자와 접근 이름이 같다(2.5.3). 막대의 단추는 폭이 좁아 '펼치기'만 글자로 보이고 이름(aria-label)은
 * '사이드바 펼치기'다 — 보이는 글자가 이름 안에 든다.
 */
export const SIDEBAR_COLLAPSE_LABEL = '사이드바 접기';
export const SIDEBAR_EXPAND_LABEL = '사이드바 펼치기';
export const SIDEBAR_EXPAND_VISIBLE_TEXT = '펼치기';
/** 사이드바 맨 위의 '사이드바 접기' 단추 — 막대의 '사이드바 펼치기'가 펼친 뒤 포커스를 이리로 돌린다. */
export const SIDEBAR_COLLAPSE_BUTTON_ID = 'sidebar-collapse-button';
/** 접힘 막대의 '사이드바 펼치기' 단추 — 사이드바의 '사이드바 접기'가 접은 뒤 포커스를 이리로 옮긴다. */
export const SIDEBAR_RAIL_EXPAND_BUTTON_ID = 'sidebar-rail-expand';

/**
 * 레이아웃 인라인 스크립트 본문. 정적 문자열이다(요청 값이 섞이지 않는다). 저장소를 쓸 수 없는 환경(사생활 보호 모드·차단된
 * 사이트 데이터)에서는 아무것도 하지 않아 기본(펼침)으로 그린다.
 */
export const SIDEBAR_COLLAPSE_SCRIPT =
  `(function(){try{if(window.localStorage.getItem('${SIDEBAR_COLLAPSED_STORAGE_KEY}')==='1')`
  + `document.documentElement.setAttribute('${SIDEBAR_COLLAPSED_ATTRIBUTE}','true');}catch(e){}})();`;
