'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import axios from '@/lib/api/client';

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
    const [leftMenus, setLeftMenus] = useState<MenuItem[]>([]);

    // Performance: Memoize menu calculation to avoid redundant fetches on route changes
    const { menuNo, parentMenuName } = React.useMemo(() => {
        if (pathname.includes('/survey')) {
            return { menuNo: 3000000, parentMenuName: '협업' };
        } else if (pathname.includes('/cop')) {
            return { menuNo: 2000000, parentMenuName: '알림' };
        }
        return { menuNo: 0, parentMenuName: '' };
    }, [pathname]);

    useEffect(() => {
        const fetchLeftMenus = async () => {
            if (menuNo > 0) {
                try {
                    const response = await axios.get(`/menu/left?menuNo=${menuNo}`);
                    if (response.data.success) {
                        setLeftMenus(response.data.list);
                    }
                } catch (error) {
                    console.error('Failed to fetch left menus', error);
                }
            } else {
                setLeftMenus([]);
            }
        };

        fetchLeftMenus();
    }, [menuNo]);

    if (pathname === '/' || pathname === '/login' || leftMenus.length === 0) {
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
        <div className="nav">
            <div className="inner">
                <h2>{parentMenuName}</h2>
                <ul className="menu_list">
                    {leftMenus.map((menu) => (
                        <li key={menu.menuNo}>
                            <Link
                                href={mapLegacyUrl(menu.chkURL)}
                                className={isActive(menu.chkURL) ? 'on' : ''}
                            >
                                {menu.menuNm}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Sidebar;
