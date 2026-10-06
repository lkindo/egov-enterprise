/**
 * 넓은 화면(lg 이상)의 사이드바 접기 — 서버 레이아웃과 클라이언트 훅이 함께 쓰는 상수(2026-10-05).
 *
 * 접힘은 `<html data-sidebar-collapsed="true">` 하나로 나타내고, 사이드바 상자를 좁은 띠로 줄이며 안쪽 내용만 숨기고 본문
 * 여백을 띠 폭으로 돌리는 일은 globals.css 의 미디어쿼리(lg 이상)가 한다(DEC-OPS-228 — 접고 펴는 단추는 사이드바 경계선의
 * 원형 아이콘 하나다, sidebar-edge-toggle.tsx). lg 미만의 서랍형 사이드바는 이 속성과 무관하다. 기본은 펼침이다.
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
/**
 * 경계선 토글 단추의 고정 접근 이름. 상태(펼침·접힘)는 aria-expanded 로만 알린다 — 이름까지 바꾸면 스크린리더가 상태를 두 번
 * 말한다(APG disclosure). 음성 제어 사용자가 어느 쪽 동사로 불러도 이름 일부가 맞도록 두 동작을 모두 담는다.
 */
export const SIDEBAR_TOGGLE_LABEL = '사이드바 접기·펼치기';
/**
 * 사이드바 안쪽 내용 컨테이너의 id — 접으면 이것만 숨고(globals.css) 경계선 단추는 남는다. 단추의 aria-controls 가 가리킨다.
 * 내용 컨테이너는 `data-app-sidebar-content` 표지를 함께 단다.
 */
export const SIDEBAR_CONTENT_ID = 'primary-sidebar-content';

/**
 * 레이아웃 인라인 스크립트 본문. 정적 문자열이다(요청 값이 섞이지 않는다). 저장소를 쓸 수 없는 환경(사생활 보호 모드·차단된
 * 사이트 데이터)에서는 아무것도 하지 않아 기본(펼침)으로 그린다.
 */
export const SIDEBAR_COLLAPSE_SCRIPT =
  `(function(){try{if(window.localStorage.getItem('${SIDEBAR_COLLAPSED_STORAGE_KEY}')==='1')`
  + `document.documentElement.setAttribute('${SIDEBAR_COLLAPSED_ATTRIBUTE}','true');}catch(e){}})();`;
