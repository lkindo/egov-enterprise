'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Folder, File, Loader2 } from "lucide-react";
import { authorAdminService } from '@/services/admin/system';
import { MenuByAuthority } from '@/types/security';

/**
 * Transforms flat menu list into a tree structure
 */
function buildMenuTree(menuList: MenuByAuthority[]): MenuByAuthority[] {
    const menuMap = new Map<number, MenuByAuthority>();
    const rootMenus: MenuByAuthority[] = [];

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

    return rootMenus;
}

export default function MenuByAuthorityPage() {
    const [selectedAuthority, setSelectedAuthority] = useState<string>('');
    const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

    const { data: authorData } = useQuery({
        queryKey: ['admin-authorities-all'],
        queryFn: () => authorAdminService.getAuthorList({ pageIndex: 1, searchCondition: '1', searchKeyword: '' } as any),
    });

    const authorities = (authorData as any)?.list || [];

    const { data: rawMenus = [], isLoading: isMenuLoading } = useQuery({
        queryKey: ['admin-menu-tree', selectedAuthority],
        queryFn: async () => {
            const data = await authorAdminService.getAuthorMenus(selectedAuthority);
            return ((data as any)?.list || (data as any)?.resultList || data || []) as MenuByAuthority[];
        },
        enabled: !!selectedAuthority,
    });

    // Memoize the tree calculation to avoid unnecessary re-renders (rerender-memo)
    const menuTree = useMemo(() => buildMenuTree(rawMenus), [rawMenus]);

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

    const renderMenuTree = (menus: MenuByAuthority[], depth: number = 0) => {
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
                            {(authorities as import('@/services/admin/system/AuthorAdminService').AuthorInfo[]).map((auth) => (
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
                        <CardTitle className="flex items-center justify-between">
                            <span>메뉴 구조</span>
                            {isMenuLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isMenuLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : menuTree.length === 0 ? (
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
