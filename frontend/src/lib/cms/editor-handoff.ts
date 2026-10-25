'use client';

/**
 * 게시된 페이지에서 관리 화면의 그 페이지 편집으로 넘긴다(ADR-0042). 열람 화면의 '이 페이지 편집' 이 주소(/pages/ 뒤)를 두고, 콘텐츠
 * 페이지 관리 화면이 열릴 때 한 번 읽어 그 페이지를 고른다.
 *
 * 핵심 인계(lib/navigation/target-handoff)와 같은 원칙이다 — URL 에 싣지 않고 이 탭의 sessionStorage 에 한 건만 두며, 짧은 시간
 * (1분) 안에 연 화면만 받고, 받은 뒤 지운다. 콘텐츠 페이지 기능이 소유하므로 이 기능이 빠진 구성에서는 함께 사라진다. 고르기만
 * 한다 — 편집·게시 권한은 서버가 그대로 집행한다.
 */

const KEY = 'egov.cms-editor-handoff.v1';
const TTL_MS = 60_000;

/** 관리 화면에 넘길 페이지 주소를 둔다. 저장했으면 true(저장소를 쓸 수 없으면 false 이고 관리 화면은 고르지 않은 채 열린다). */
export function handOffContentPage(contsPathNm: string): boolean {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ contsPathNm, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

/** 유효한 인계를 꺼낸다(꺼내면 지운다). 없거나 오래됐거나 형식이 틀리면 null. */
export function takeContentPageHandoff(): string | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { contsPathNm?: unknown; at?: unknown };
    if (typeof value.at !== 'number' || Date.now() - value.at > TTL_MS) return null;
    return typeof value.contsPathNm === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value.contsPathNm)
      ? value.contsPathNm : null;
  } catch {
    return null;
  }
}
