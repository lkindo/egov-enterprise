'use client';

import React, { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

interface LayoutContextType {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  activeMenuNo: number;
  setActiveMenuNo: (no: number) => void;
}

/**
 * 고른 상위 메뉴는 context 값이 아니라 구독 저장소로 넘긴다(2026-10-21). 머리글이 첫 화면 직후 현재 URL 의 메뉴를 고르는데,
 * 그때 context 값이 바뀌면 스트리밍 공개를 기다리는 본문 경계를 React 가 브라우저에서 다시 그리고 서버 사본이 잠시 숨은 채
 * 남는다. 구독은 메뉴 번호를 읽는 소비자만 다시 그린다.
 */
/** 서버가 그릴 때의 값. 하이드레이션은 이 값으로 그려야 서버 HTML 과 맞는다 — 머리글이 먼저 바꾼 값을 뒤늦게 깨어나는
 *  사이드바·본문이 하이드레이션 중에 읽으면 글자가 달라져 React #418 이 난다. 바뀐 값은 하이드레이션 뒤에 다시 그린다. */
const SERVER_ACTIVE_MENU_NO = 0;
const serverActiveMenuNo = () => SERVER_ACTIVE_MENU_NO;

function createActiveMenuStore() {
  let menuNo = SERVER_ACTIVE_MENU_NO;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    get: () => menuNo,
    set(next: number) {
      if (next === menuNo) return;
      menuNo = next;
      listeners.forEach(listener => listener());
    },
  };
}

type LayoutState = Pick<LayoutContextType, 'isSidebarOpen' | 'setSidebarOpen' | 'toggleSidebar'> & {
  activeMenu: ReturnType<typeof createActiveMenuStore>;
};

export const LayoutContext = createContext<LayoutState | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu] = useState(createActiveMenuStore);
  const pathname = usePathname();

  // 페이지 이동 시 사이드바 닫기 (모바일 대응).
  //
  // [2026-08-15] 이펙트가 아니라 **렌더 중 조정(adjusting state during render)** 으로 처리한다.
  //   이펙트는 paint **이후**에 실행되므로, 프로그램적 라우팅(router.push · 뒤로가기 · 리다이렉트)에서
  //   새 페이지가 그려진 한 프레임 동안 모바일 오버레이가 그대로 얹혀 보인다. 렌더 중 조정은 커밋 전에
  //   다시 렌더되어 그 프레임이 아예 존재하지 않는다 — React 가 이 상황에 공식 권장하는 패턴이다.
  //   (주 경로인 메뉴 클릭은 NavItem 의 핸들러가 먼저 닫으므로, 이 로직은 그 밖의 이동을 받는 안전망이다.)
  //
  //   ⚠ 가드(`pathname !== prevPathname`)는 필수다. 없으면 렌더마다 setState 가 돌아 무한 루프가 되고,
  //     이 Provider 는 앱 전체를 감싸므로 전 화면이 죽는다. setPrevPathname 이 조건을 즉시 해소해
  //     1회 재렌더로 수렴한다.
  //   ⚠ 비교 대상은 pathname 뿐이다 — usePathname() 은 쿼리스트링을 포함하지 않으므로 종전 이펙트와
  //     재실행 조건이 정확히 같다(검색 파라미터만 바뀌면 닫지 않는다).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setSidebarOpen(false);
  }

  const toggleSidebar = useCallback(() => setSidebarOpen(open => !open), []);
  // 값이 바뀔 때만 새 객체다 — 이 공급자는 앱 전체를 감싸므로 바뀌지 않은 값으로 아래 경계를 깨우지 않는다.
  const value = useMemo(() => ({ isSidebarOpen, setSidebarOpen, toggleSidebar, activeMenu }), [isSidebarOpen, toggleSidebar, activeMenu]);

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextType {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  const { activeMenu, ...sidebar } = context;
  const activeMenuNo = useSyncExternalStore(activeMenu.subscribe, activeMenu.get, serverActiveMenuNo);
  return { ...sidebar, activeMenuNo, setActiveMenuNo: activeMenu.set };
}
