'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // 페이지 이동 시 사이드바 닫기 (모바일)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
