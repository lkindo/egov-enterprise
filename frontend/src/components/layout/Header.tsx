'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import axios from '@/lib/api/client';
import { useLayout } from '@/contexts/LayoutContext';
import { usePathname } from 'next/navigation';

interface MenuItem {
    menuNo: number;
    menuNm: string;
    chkURL: string;
    children?: MenuItem[];
}

const Header = () => {
    const { user, logout, loading } = useAuth();
    const { activeMenuNo, setActiveMenuNo } = useLayout();
    const pathname = usePathname();
    const [menus, setMenus] = useState<MenuItem[]>([]);
    const [menuError, setMenuError] = useState<string | null>(null);

    const fetchMenus = useCallback(async () => {
        try {
            setMenuError(null);
            const response = (await axios.get('/menu/head')) as any;
            const list = response?.list || [];
            setMenus(list);
        } catch (err: any) {
            console.error('Failed to fetch menus:', err);
            setMenuError(err.message || 'Failed to fetch menus');
            setMenus([]);
        }
    }, []);

    useEffect(() => {
        fetchMenus();
    }, [fetchMenus]);

    // Auto-detect active domain based on children's URLs
    useEffect(() => {
        const findActiveDomain = (menuList: MenuItem[]): number => {
            for (const menu of menuList) {
                // Check if current pathname starts with any child URL (excluding # and /)
                const hasMatch = (item: MenuItem): boolean => {
                    if (item.chkURL && item.chkURL !== '#' && item.chkURL !== '/') {
                        if (pathname.startsWith(item.chkURL)) return true;
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
                            <img src="/api/v1/images/logo.png" alt="표준프레임워크 포털 eGovFrame 샘플 포털" />
                        </Link>
                    </h1>
                </div>

                <div className="top_menu">
                    {loading ? (
                        <span className="t">로딩중...</span>
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
                        {menus.map((menu) => (
                            <li key={menu.menuNo}>
                                <Link
                                    href={menu.chkURL || '#'}
                                    className={`${activeMenuNo === menu.menuNo ? 'on' : ''}`}
                                    onClick={() => setActiveMenuNo(menu.menuNo)}
                                >
                                    {menu.menuNm}
                                </Link>
                            </li>
                        ))}
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