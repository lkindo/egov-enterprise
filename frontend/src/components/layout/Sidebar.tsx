'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import axios from '@/lib/api/client';
import { SidebarSkeleton } from './SidebarSkeleton';

interface MenuItem {
    menuNo: number;
    menuNm: string;
    chkURL: string;
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

    // Optimize: Memoize menuNo to prevent redundant API calls on route changes within same section
    const menuNo = useMemo(() => {
        if (pathname.includes('/survey')) return 3000000;
        if (pathname.includes('/cop')) return 2000000;
        return 0;
    }, [pathname]);

    const [leftMenus, setLeftMenus] = useState<MenuItem[]>([]);
    const [parentMenuName, setParentMenuName] = useState('');

    // State for tracking loading and previous menuNo
    const [prevMenuNo, setPrevMenuNo] = useState(menuNo);
    const [isLoading, setIsLoading] = useState(menuNo > 0);

    // Update state during render when menuNo changes to prevent stale content flash
    if (menuNo !== prevMenuNo) {
        setPrevMenuNo(menuNo);
        setLeftMenus([]);
        if (menuNo > 0) {
            setIsLoading(true);
            if (menuNo === 3000000) setParentMenuName('협업');
            else if (menuNo === 2000000) setParentMenuName('알림');
            else setParentMenuName('');
        } else {
            setIsLoading(false);
            setParentMenuName('');
        }
    }

    useEffect(() => {
        const fetchLeftMenus = async () => {
            if (menuNo > 0) {
                // Determine parent menu name (also done in render, but safe to keep here or rely on render)
                // We'll rely on render for immediate update, but ensure it's correct here too if needed
                if (menuNo === 3000000) setParentMenuName('협업');
                else if (menuNo === 2000000) setParentMenuName('알림');

                try {
                    const response = await axios.get(`/menu/left?menuNo=${menuNo}`);
                    if (response.data.success) {
                        setLeftMenus(response.data.list);
                    }
                } catch (error) {
                    console.error('Failed to fetch left menus', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setLeftMenus([]);
                setIsLoading(false);
            }
        };

        // Only fetch if we are in a loading state or if menuNo changed (which triggers loading state)
        // But useEffect runs after render.
        fetchLeftMenus();
    }, [menuNo]);

    if (pathname === '/' || pathname === '/login') {
        return null;
    }

    if (isLoading && menuNo > 0) {
        return <SidebarSkeleton />;
    }

    if (leftMenus.length === 0) {
        return null;
    }

    const isActive = (menuUrl: string) => {
        const mapped = mapLegacyUrl(menuUrl);
        if (mapped === pathname) return true;

        // Handle board detail active state when list is selected
        if (pathname.includes('selectBoardArticle') && mapped.includes('selectBoardList')) {
            const pathBbsId = searchParams.get('bbsId');
            const menuBbsId = new URLSearchParams(mapped.split('?')[1]).get('bbsId');
            return pathBbsId === menuBbsId;
        }

        return false;
    };

    return (
        <nav className="nav" aria-label="서브 메뉴">
            <div className="inner">
                <h2>{parentMenuName}</h2>
                <ul className="menu_list">
                    {leftMenus.map((menu) => (
                        <li key={menu.menuNo}>
                            <Link
                                href={mapLegacyUrl(menu.chkURL)}
                                className={isActive(menu.chkURL) ? 'on' : ''}
                                aria-current={isActive(menu.chkURL) ? 'page' : undefined}
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
