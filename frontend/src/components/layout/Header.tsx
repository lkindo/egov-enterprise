'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import axios from '@/lib/api/client';

interface MenuItem {
    menuNo: number;
    menuNm: string;
    chkURL: string;
    children?: MenuItem[];
}

const Header = () => {
    const { user, logout, loading } = useAuth();
    const [menus, setMenus] = useState<MenuItem[]>([]);
    const [menuError, setMenuError] = useState<string | null>(null);

    const fetchMenus = useCallback(async () => {
        try {
            setMenuError(null);
            const response = await axios.get('/menu/head');
            if (response.data.success) {
                setMenus(response.data.list);
            } else {
                setMenuError('Failed to fetch menus');
                setMenus([]);
            }
        } catch (err: any) {
            console.error('Failed to fetch menus:', err);
            setMenuError(err.message || 'Failed to fetch menus');
            setMenus([]);
        }
    }, []);

    useEffect(() => {
        fetchMenus();
    }, [fetchMenus]);

    return (
        <div className="header">
            <div className="inner">
                <div className="left_col">
                    <h1 className="logo">
                        <Link href="/">
                            <img src="/api/v1/images/logo.png" alt="표준프레임워크 포털 eGovFrame 샘플 포털" />
                        </Link>
                    </h1>
                    <button type="button" className="go" style={{ backgroundColor: 'transparent', border: 0, padding: 0 }}>
                        <img src="/api/v1/images/ico_question.png" alt="메뉴구성 설명" />
                    </button>
                </div>

                <div className="top_menu">
                    {loading ? (
                        <span className="t">로딩중...</span>
                    ) : user ? (
                        <>
                            <span className="t">
                                <span style={{ cursor: 'pointer' }}>{user.name} 님</span>의 최종접속정보는
                            </span>
                            <span className="d"> 2021-06-30 12:45 입니다.</span>
                            <button onClick={logout} className="btn btn_blue_15 w_90" style={{ border: 0, cursor: 'pointer' }}>
                                로그아웃
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="t"><span>로그인정보 없음</span> &nbsp;</span>
                            <span className="d">로그인후 사용하십시오</span>
                            <Link href="/login" className="btn btn_blue_15 w_90">로그인</Link>
                        </>
                    )}
                </div>

                <div className="gnb">
                    <ul>
                        {menus.map((menu) => (
                            <li key={menu.menuNo}>
                                <Link href={menu.chkURL || '#'} className={menu.menuNo >= 5 ? 'manager' : ''}>
                                    {menu.menuNm}
                                </Link>
                                {menu.children && menu.children.length > 0 && (
                                    <div className="depth2_wrap">
                                        <ul>
                                            {menu.children.map((child) => (
                                                <li key={child.menuNo}>
                                                    <Link href={child.chkURL}>{child.menuNm}</Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
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
