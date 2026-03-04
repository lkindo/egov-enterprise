'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import axios from '@/lib/api/client';

import { useLayout } from '@/contexts/LayoutContext';

interface MenuItem {
    menuNo: number;
    menuNm: string;
    chkURL: string;
    children?: MenuItem[];
}

const Sidebar = () => {
    const pathname = usePathname();
    const { activeMenuNo } = useLayout();
    const [leftMenus, setLeftMenus] = useState<MenuItem[]>([]);
    const [parentMenu, setParentMenu] = useState<MenuItem | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchLeftMenus = useCallback(async () => {
        if (!activeMenuNo) {
            setLeftMenus([]);
            return;
        }

        try {
            setError(null);
            // Fetch the root category itself to get its name
            const headRes = (await axios.get('/menu/head')) as any;
            const root = headRes?.list?.find((m: any) => m.menuNo === activeMenuNo);
            if (root) setParentMenu(root);

            // Fetch children (mid-categories)
            const response = (await axios.get(`/menu/left?menuNo=${activeMenuNo}`)) as any;
            const list = response?.list || [];
            setLeftMenus(list);
        } catch (err: any) {
            console.error('Failed to fetch left menus:', err);
            setError(err.message || 'Failed to fetch menus');
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
                {parentMenu && <h2 className="text-xl font-bold mb-6">{parentMenu.menuNm}</h2>}

                {error && (
                    <div className="text-red-500 text-sm p-2">{error}</div>
                )}

                <div className="space-y-4">
                    {leftMenus.map((group) => (
                        <div key={group.menuNo} className="menu_group">
                            <h3 className="text-sm font-semibold text-slate-400 mb-2 px-2 uppercase tracking-wider">
                                {group.menuNm}
                            </h3>
                            <ul className="space-y-1">
                                {group.children?.map((item) => (
                                    <li key={item.menuNo}>
                                        <Link
                                            href={item.chkURL || '#'}
                                            className={`block px-3 py-2 rounded-lg text-sm transition-all ${isActive(item.chkURL)
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