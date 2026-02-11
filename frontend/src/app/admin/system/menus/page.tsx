'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getMenuList } from '@/services/system/menuService';
import { MenuManage, SearchParams } from '@/types/system';
import { MenuForm } from '@/components/admin/system/MenuForm';
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PagePagination } from "@/components/common/PagePagination";

export default function MenuPage() {
    const queryClient = useQueryClient();
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchCondition: '1',
        searchKeyword: '',
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedMenu, setSelectedMenu] = useState<MenuManage | undefined>(undefined);

    const { data, isLoading } = useQuery({
        queryKey: ['admin-menus', params],
        queryFn: () => getMenuList(params),
    });

    const menus = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const handleCreate = () => {
        setSelectedMenu(undefined);
        setIsFormOpen(true);
    }

    const handleEdit = (menu: MenuManage) => {
        setSelectedMenu(menu);
        setIsFormOpen(true);
    }

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-menus'] });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">메뉴 관리</h2>
                <Button onClick={handleCreate}>신규 등록</Button>
            </div>

            <form onSubmit={handleSearch} className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Select
                    value={params.searchCondition}
                    onValueChange={(value) => setParams(prev => ({ ...prev, searchCondition: value }))}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="검색조건" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">메뉴명</SelectItem>
                        <SelectItem value="2">프로그램파일명</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    placeholder="검색어를 입력하세요"
                    className="max-w-sm"
                    value={params.searchKeyword || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                />
                <Button type="submit">조회</Button>
            </form>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">메뉴ID</TableHead>
                            <TableHead>한글명</TableHead>
                            <TableHead>프로그램파일명</TableHead>
                            <TableHead>설명</TableHead>
                            <TableHead>상위메뉴ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableSkeleton columnCount={5} rowCount={10} />
                        ) : menus.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            menus.map((menu) => (
                                <TableRow
                                    key={menu.menuNo}
                                    className="cursor-pointer hover:bg-slate-50"
                                    onClick={() => handleEdit(menu)}
                                >
                                    <TableCell>{menu.menuNo}</TableCell>
                                    <TableCell>{menu.menuNm}</TableCell>
                                    <TableCell>{menu.progrmFileNm}</TableCell>
                                    <TableCell>{menu.menuDc}</TableCell>
                                    <TableCell>{menu.upperMenuId}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && (
                <PagePagination
                    pagination={pagination}
                    onPageChange={(page) => setParams(prev => ({ ...prev, pageIndex: page }))}
                />
            )}

            <MenuForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                data={selectedMenu}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
