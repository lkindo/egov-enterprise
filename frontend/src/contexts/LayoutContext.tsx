'use client';

import React, { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';

interface LayoutContextType {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  activeMenuNo: number;
  setActiveMenuNo: (no: number) => void;
}

export const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenuNo, setActiveMenuNo] = useState<number>(0);
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

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <LayoutContext.Provider value={{
      isSidebarOpen,
      setSidebarOpen,
      toggleSidebar,
      activeMenuNo,
      setActiveMenuNo
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
