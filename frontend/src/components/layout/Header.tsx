'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import axios from '@/lib/api/client';
import { useLayout } from '@/contexts/LayoutContext';
import { usePathname } from 'next/navigation';

import { MenuInfo } from '@/types/foundation/menu';

const Header = () => {
  const { user, logout, loading } = useAuth();
  const { activeMenuNo, setActiveMenuNo } = useLayout();
  const pathname = usePathname();
  const [menus, setMenus] = useState<MenuInfo[]>([]);

  const fetchMenus = useCallback(async () => {
    try {
      const headRes = await axios.get<{ list: MenuInfo[] }>('/menus/head');
      const list = headRes?.list || [];
      setMenus(list);
    } catch (err: unknown) {
      console.error('Failed to fetch menus:', err);
      setMenus([]);
    }
  }, [user]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  // Auto-detect active domain based on children's URLs (modernRoute priority)
  useEffect(() => {
    const findActiveDomain = (menuList: MenuInfo[]): number => {
      for (const menu of menuList) {
        const hasMatch = (item: MenuInfo): boolean => {
          const url = item.modernRoute || item.chkURL;
          if (url && url !== '#' && url !== '/') {
            if (pathname.startsWith(url)) return true;
          }
          return item.children?.some(hasMatch) || false;
        };
        if (hasMatch(menu)) return menu.menuNo;
      }
      return 0;
    };

    const detectedNo = findActiveDomain(menus);
    if (detectedNo !== 0 && detectedNo !== activeMenuNo) {
      setActiveMenuNo(detectedNo);
    }
  }, [menus, pathname, activeMenuNo, setActiveMenuNo]);

  return (
    <div className="header">
      <div className="inner">
        <div className="left_col">
          <h1 className="logo">
            <Link href="/">
              <Image src="/api/v1/images/logo.png" alt="표준프레임워크 포털 eGovFrame 샘플 포털" width={200} height={40} priority />
            </Link>
          </h1>
        </div>

        <div className="top_menu">
          {loading ? (
            <span className="t">로딩 중...</span>
          ) : user ? (
            <>
              <span className="t">
                <span style={{ cursor: 'pointer' }}>{user.name} 님</span>
              </span>
              <button onClick={logout} className="btn btn_blue_15 w_90" style={{ border: 0, cursor: 'pointer', marginLeft: '10px' }}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn_blue_15 w_90">로그인</Link>
            </>
          )}
        </div>

        <div className="gnb">
          <ul>
            {menus.map((menu) => {
              // 대메뉴 자체 경로가 없으면 첫 번째 자식의 경로를 사용
              const getMenuLink = (m: MenuInfo): string => {
                if (m.modernRoute && m.modernRoute !== '#') return m.modernRoute;
                if (m.chkURL && m.chkURL !== '#') return m.chkURL;
                if (m.children && m.children.length > 0) return getMenuLink(m.children[0]);
                return '#';
              };
              const targetHref = getMenuLink(menu);

              return (
                <li key={menu.menuNo}>
                  <Link
                    href={targetHref}
                    className={`${activeMenuNo === menu.menuNo ? 'on' : ''}`}
                    onClick={() => setActiveMenuNo(menu.menuNo)}
                  >
                    {menu.menuNm}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="util_menu">
          <ul>
            <li><a href="#" className="allmenu" title="전체메뉴">전체메뉴</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Header;
