'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import axios from '@/lib/api/client';

interface MenuItem {
    menuNo: number;
    menuNm: string;
    chkURL: string;
}

interface MappedMenuItem extends MenuItem {
    mappedUrl: string;
}

// Helper to map legacy .do URLs to Next.js routes
const mapLegacyUrl = (url: string) => {
    if (!url) return '#';

    // Board list mapping
    if (url.includes('selectBoardList.do')) {
        const bbsId = new URLSearchParams(url.split('?')[1]).get('bbsId');
        return `/cop/bbs/selectBoardList?bbsId=${bbsId}`;
    }

    // Board detail mapping
    if (url.includes('selectBoardArticle.do')) {
        const search = url.split('?')[1];
        const params = new URLSearchParams(search);
        const bbsId = params.get('bbsId');
        const nttId = params.get('nttId');
        return `/cop/bbs/selectBoardArticle/${nttId}?bbsId=${bbsId}`;
    }

    // Community mapping
    if (url.includes('EgovCmmntyList.do')) {
        return '/cop/cmy/selectCommunityList';
    }

    // Address Book mapping
    if (url.includes('EgovAddressBookList.do')) {
        return '/cop/adb/selectAddressBookList';
    }

    // Schedule mapping
    if (url.includes('EgovSchdulManageList.do')) {
        return '/cop/smt/sim/selectScheduleList';
    }

    // Scrap mapping
    if (url.includes('EgovScrapList.do')) {
        return '/cop/scp/selectScrapList';
    }

    // DeptJob mapping
    if (url.includes('EgovDeptJobBxList.do')) {
        return '/cop/smt/djm/selectDeptJobList';
    }

    // Survey mapping
    if (url.includes('EgovQustnrRespondInfoList.do')) {
        return '/survey';
    }

    return url;
};

const Sidebar = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [leftMenus, setLeftMenus] = useState<MappedMenuItem[]>([]);
    const [parentMenuName, setParentMenuName] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Optimize: Memoize menuNo to prevent redundant API calls on route changes within same section
    const menuNo = useMemo(() => {
        if (pathname.includes('/survey')) return 3000000;
        if (pathname.includes('/cop')) return 2000000;
        return 0;
    }, [pathname]);

    const fetchLeftMenus = useCallback(async () => {
        // Update parent menu name based on active menu number
        if (menuNo === 3000000) {
            setParentMenuName('협업');
        } else if (menuNo === 2000000) {
            setParentMenuName('알림');
        } else {
            setParentMenuName('');
        }

        if (menuNo > 0) {
            try {
                setError(null);
                const response = await axios.get(`/menu/left?menuNo=${menuNo}`);
                if (response.data.success) {
                    // Optimize: Pre-calculate mapped URLs once to avoid redundant parsing in render loop
                    const mappedList = response.data.list.map((item: MenuItem) => ({
                        ...item,
                        mappedUrl: mapLegacyUrl(item.chkURL)
                    }));
                    setLeftMenus(mappedList);
                } else {
                    setError('Failed to fetch menus');
                    setLeftMenus([]);
                }
            } catch (err: any) {
                console.error('Failed to fetch left menus:', err);
                setError(err.message || 'Failed to fetch menus');
                setLeftMenus([]);
            }
        } else {
            setLeftMenus([]);
        }
    }, [menuNo]);

    useEffect(() => {
        fetchLeftMenus();
    }, [fetchLeftMenus]);

    if (pathname === '/' || pathname === '/login') {
        return null;
    }

    const isActive = useCallback((menu: MappedMenuItem) => {
        const mapped = menu.mappedUrl;
        if (mapped === pathname) return true;

        // Handle board detail active state when list is selected
        if (pathname.includes('selectBoardArticle') && mapped.includes('selectBoardList')) {
            const pathBbsId = searchParams.get('bbsId');
            const menuBbsId = new URLSearchParams(mapped.split('?')[1]).get('bbsId');
            return pathBbsId === menuBbsId;
        }

        return false;
    }, [pathname, searchParams]);

    // Don't render sidebar if no menus and not an error state
    if (leftMenus.length === 0 && !error) {
        return null;
    }

    return (
        <nav className="nav" aria-label="서브 메뉴">
            <div className="inner">
                <h2>{parentMenuName}</h2>
                {error && (
                    <div className="text-red-500 text-sm p-2">{error}</div>
                )}
                <ul className="menu_list">
                    {leftMenus.map((menu) => (
                        <li key={menu.menuNo}>
                            <Link
                                href={menu.mappedUrl}
                                className={isActive(menu) ? 'on' : ''}
                                aria-current={isActive(menu) ? 'page' : undefined}
                            >
                                {menu.menuNm}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};

export default Sidebar;
