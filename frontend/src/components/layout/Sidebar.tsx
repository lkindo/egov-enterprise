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

// Helper to determine URL
const getMenuUrl = (item: MenuItem) => {
    return item.chkURL || '#';
};

interface SidebarProps {
    initialMenus?: MappedMenuItem[];
}

const Sidebar = ({ initialMenus = [] }: SidebarProps) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [leftMenus, setLeftMenus] = useState<MappedMenuItem[]>(initialMenus);
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

        // If we have initialMenus and they matching the current menuNo logic, but wait...
        // initialMenus in RootLayout is based on GNB. 
        // Let's actually check if initialMenus is passed.
        if (initialMenus.length > 0 && leftMenus === initialMenus) {
            // Already have menus, but maybe need to update name
            return;
        }

        if (menuNo > 0) {
            try {
                setError(null);
                const response = (await axios.get(`/menu/left?menuNo=${menuNo}`)) as any;
                // axios (client.ts) already extracts apiBody.data and handles success true/false
                const list = response?.list || [];
                const mappedList = list.map((item: MenuItem) => ({
                    ...item,
                    mappedUrl: getMenuUrl(item)
                }));
                setLeftMenus(mappedList);
            } catch (err: any) {
                console.error('Failed to fetch left menus:', err);
                setError(err.message || 'Failed to fetch menus');
                setLeftMenus([]);
            }
        } else {
            setLeftMenus([]);
        }
    }, [menuNo, initialMenus]);

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
