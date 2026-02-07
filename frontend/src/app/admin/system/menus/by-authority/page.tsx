'use client';

import { useState, useCallback, useEffect } from 'react';

export const dynamic = 'force-dynamic';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Folder, File } from "lucide-react";
import client from '@/lib/api/client';

interface AuthorInfo {
    authorCode: string;
    authorNm: string;
}

interface MenuTreeItem {
    menuNo: number;
    menuNm: string;
    upperMenuId: number;
    menuOrdr: number;
    progrmFileNm: string;
    children?: MenuTreeItem[];
}

export default function MenuByAuthorityPage() {
    const [authorities, setAuthorities] = useState<AuthorInfo[]>([]);
    const [selectedAuthority, setSelectedAuthority] = useState<string>('');
    const [menuTree, setMenuTree] = useState<MenuTreeItem[]>([]);
    const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

    const fetchAuthorities = useCallback(async () => {
        try {
            const { data } = await client.get('/sec/ram/EgovAuthorList.do', { params: { pageIndex: 1 } });
            if (data && data.resultList) {
                setAuthorities(data.resultList);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    const fetchMenusByAuthority = useCallback(async (authorCode: string) => {
        try {
            const { data } = await client.get('/sym/mnu/mcm/EgovMenuCreatList.do', { params: { authorCode } });
            if (data && data.resultList) {
                // 계층 구조로 변환
                const menuList = data.resultList as MenuTreeItem[];
                const menuMap = new Map<number, MenuTreeItem>();
                const rootMenus: MenuTreeItem[] = [];

                menuList.forEach(menu => {
                    menuMap.set(menu.menuNo, { ...menu, children: [] });
                });

                menuList.forEach(menu => {
                    const currentMenu = menuMap.get(menu.menuNo)!;
                    if (menu.upperMenuId === 0) {
                        rootMenus.push(currentMenu);
                    } else {
                        const parent = menuMap.get(menu.upperMenuId);
                        if (parent) {
                            parent.children = parent.children || [];
                            parent.children.push(currentMenu);
                        }
                    }
                });

                setMenuTree(rootMenus);
            } else {
                setMenuTree([]);
            }
        } catch (error) {
            console.error(error);
            setMenuTree([]);
        }
    }, []);

    useEffect(() => {
        fetchAuthorities();
    }, [fetchAuthorities]);

    useEffect(() => {
        if (selectedAuthority) {
            fetchMenusByAuthority(selectedAuthority);
        }
    }, [selectedAuthority, fetchMenusByAuthority]);

    const toggleExpand = (menuNo: number) => {
        setExpandedMenus(prev => {
            const newSet = new Set(prev);
            if (newSet.has(menuNo)) {
                newSet.delete(menuNo);
            } else {
                newSet.add(menuNo);
            }
            return newSet;
        });
    };

    const renderMenuTree = (menus: MenuTreeItem[], depth: number = 0) => {
        return menus.map(menu => {
            const hasChildren = menu.children && menu.children.length > 0;
            const isExpanded = expandedMenus.has(menu.menuNo);

            return (
                <div key={menu.menuNo}>
                    <div
                        className="flex items-center gap-2 py-2 px-3 hover:bg-slate-50 cursor-pointer rounded"
                        style={{ paddingLeft: `${depth * 24 + 12}px` }}
                        onClick={() => hasChildren && toggleExpand(menu.menuNo)}
                    >
                        {hasChildren ? (
                            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        ) : (
                            <span className="w-4" />
                        )}
                        {hasChildren ? (
                            <Folder className="h-4 w-4 text-amber-500" />
                        ) : (
                            <File className="h-4 w-4 text-slate-400" />
                        )}
                        <span className="flex-1">{menu.menuNm}</span>
                        <span className="text-sm text-muted-foreground">{menu.progrmFileNm}</span>
                    </div>
                    {hasChildren && isExpanded && renderMenuTree(menu.children!, depth + 1)}
                </div>
            );
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">권한별 메뉴 조회</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>권한 선택</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select value={selectedAuthority} onValueChange={setSelectedAuthority}>
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="권한을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            {authorities.map(auth => (
                                <SelectItem key={auth.authorCode} value={auth.authorCode}>
                                    {auth.authorNm} ({auth.authorCode})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {selectedAuthority && (
                <Card>
                    <CardHeader>
                        <CardTitle>메뉴 구조</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {menuTree.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                해당 권한에 할당된 메뉴가 없습니다.
                            </div>
                        ) : (
                            <div className="border rounded-lg p-2">
                                {renderMenuTree(menuTree)}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
