'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { SIDEBAR_COLLAPSED_ATTRIBUTE, SIDEBAR_COLLAPSED_STORAGE_KEY } from './sidebar-collapse-script';

/**
 * 넓은 화면의 사이드바 접힘 상태(2026-10-05). 정본은 `<html data-sidebar-collapsed>` 속성이다 — 루트 레이아웃의 인라인
 * 스크립트가 그리기 전에 이 브라우저의 기억을 속성으로 되살리고, 토글은 속성과 저장소를 함께 바꾼다. 저장소를 쓸 수 없어도
 * 속성은 바뀌므로 이번 화면에서는 접기·펼치기가 그대로 동작한다(다음 방문에 기억하지 못할 뿐이다).
 *
 * 화면 표현(숨김·본문 여백)은 CSS 가 속성으로 정한다. 이 훅은 머리글 단추의 aria-expanded·이름만 맞춘다 — 서버 렌더와
 * 하이드레이션은 펼침(서버 스냅샷 false)으로 그리고, 하이드레이션 직후 속성 값으로 다시 그린다(useSyncExternalStore).
 * 뷰포트로 렌더를 가르지 않는다(ADR-0006) — 사용자가 고른 표시 설정을 읽을 뿐이다.
 *
 * 다른 탭과는 맞추지 않는다(storage 이벤트를 구독하지 않는다) — 탭마다 사이드바를 따로 접어 두는 것이 자연스러운 개인 편의
 * 상태이고, 다른 탭에서 바꾼 값은 다음 화면 로드 때 반영된다. 탭 간 동기화가 필요해지면 여기서 storage 이벤트를 구독한다.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return document.documentElement.getAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE) === 'true';
}

function getServerSnapshot(): boolean {
  return false;
}

/** 접힘을 속성에 적용하고 이 브라우저에 기억한다. 저장 실패는 화면 동작을 막지 않는다. */
export function setSidebarCollapsed(collapsed: boolean): void {
  const root = document.documentElement;
  if (collapsed) root.setAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');
  else root.removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  try {
    if (collapsed) window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, '1');
    else window.localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  } catch {
    // 기억하지 못해도 이번 화면의 접기·펼치기는 그대로 동작한다.
  }
  listeners.forEach((listener) => listener());
}

export function useSidebarCollapsed(): { collapsed: boolean; toggle: () => void } {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => setSidebarCollapsed(!getSnapshot()), []);
  return { collapsed, toggle };
}
