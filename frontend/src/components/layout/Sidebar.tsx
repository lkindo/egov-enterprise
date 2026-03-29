'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import axios from '@/lib/api/client';

import { useLayout } from '@/contexts/LayoutContext';

import { MenuInfo } from '@/types/foundation/menu';

const Sidebar = () => {
 const pathname = usePathname();
 const { activeMenuNo } = useLayout();
 const [leftMenus, setLeftMenus] = useState<MenuInfo[]>([]);
 const [parentMenu, setParentMenu] = useState<MenuInfo | null>(null);
 const [error, setError] = useState<string | null>(null);

  const fetchLeftMenus = useCallback(async () => {
    if (!activeMenuNo) {
      setLeftMenus([]);
      return;
    }

    try {
      setError(null);
      // Fetch the root category itself to get its name
      const headRes = await axios.get<{ list: MenuInfo[] }>('/menus/head');
      const root = headRes?.list?.find((m: MenuInfo) => m.menuNo === activeMenuNo);
      if (root) setParentMenu(root);

      // Fetch children (mid-categories)
      const response = await axios.get<{ list: MenuInfo[] }>(`/menus/left?menuNo=${activeMenuNo}`);
      const list = response?.list || [];
      setLeftMenus(list);
    } catch (err: unknown) {
      console.error('Failed to fetch left menus:', err);
      const message = err instanceof Error ? err.message : 'Failed to fetch menus';
      setError(message);
    }
  }, [activeMenuNo]);

 useEffect(() => {
 fetchLeftMenus();
 }, [fetchLeftMenus]);

 if (pathname === '/' || pathname === '/login' || !activeMenuNo) {
 return null;
 }

 const isActive = (url: string) => {
 if (!url || url === '#') return false;
 return pathname.startsWith(url);
 };

 return (
 <nav className="nav" aria-label="서브 메뉴">
 <div className="inner">
 {parentMenu ? <h2 className="text-xl font-bold mb-6">{parentMenu.menuNm}</h2> : null}

 {error && (
 <div className="text-red-500 text-sm p-2">{error}</div>
 )}

 <div className="space-y-4">
 {leftMenus.map((group) => (
 <div key={group.menuNo} className="menu_group">
 <h3 className="text-sm font-semibold text-slate-400 mb-2 px-2 tracking-tight">
 {group.menuNm}
 </h3>
 <ul className="space-y-1">
 {group.children?.map((item) => (
 <li key={item.menuNo}>
  <Link
  href={item.modernRoute || item.chkURL || '#'}
  className={`block px-3 py-2 rounded-lg text-sm transition-all ${isActive(item.modernRoute || item.chkURL || '')
  ? 'bg-primary text-white font-bold shadow-md shadow-primary/20'
  : 'text-slate-600 hover:bg-slate-100'
  }`}
  >
 {item.menuNm}
 </Link>
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 </div>
 </nav>
 );
};

export default Sidebar;
