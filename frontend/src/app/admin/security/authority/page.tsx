'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus } from "lucide-react";
import { getAuthorList, createAuthor, updateAuthor, deleteAuthor } from '@/services/security/securityService';
import { AuthorManage } from '@/types/security';
import { SearchParams } from '@/types/system';
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PagePagination } from "@/components/common/PagePagination";

export default function AuthorityManagePage() {
    const queryClient = useQueryClient();
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchKeyword: '',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAuthority, setEditingAuthority] = useState<AuthorManage | null>(null);
    const [formData, setFormData] = useState<AuthorManage>({
        authorCode: '',
        authorNm: '',
        authorDc: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-authorities', params],
        queryFn: () => getAuthorList(params),
    });

    const authorities = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const createMutation = useMutation({
        mutationFn: createAuthor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
            setIsDialogOpen(false);
        },
        onError: () => alert('저장 중 오류가 발생했습니다.')
    });

    const updateMutation = useMutation({
        mutationFn: updateAuthor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
            setIsDialogOpen(false);
        },
        onError: () => alert('저장 중 오류가 발생했습니다.')
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAuthor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
        },
        onError: () => alert('삭제 중 오류가 발생했습니다.')
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const handleCreate = () => {
        setEditingAuthority(null);
        setFormData({ authorCode: '', authorNm: '', authorDc: '' });
        setIsDialogOpen(true);
    };

    const handleEdit = (authority: AuthorManage) => {
        setEditingAuthority(authority);
        setFormData(authority);
        setIsDialogOpen(true);
    };

    const handleDelete = async (authorCode: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        deleteMutation.mutate(authorCode);
    };

    const handleSubmit = async () => {
        if (editingAuthority) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">권한 관리</h2>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    신규 등록
                </Button>
            </div>

            <form onSubmit={handleSearch} className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="권한코드 또는 권한명으로 검색"
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
                            <TableHead className="w-[80px]">순번</TableHead>
                            <TableHead>권한코드</TableHead>
                            <TableHead>권한명</TableHead>
                            <TableHead>설명</TableHead>
                            <TableHead>등록일</TableHead>
                            <TableHead className="w-[120px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableSkeleton columnCount={6} rowCount={10} />
                        ) : authorities.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            authorities.map((auth, index) => (
                                <TableRow key={auth.authorCode}>
                                    <TableCell>{index + 1 + ((params.pageIndex || 1) - 1) * 10}</TableCell>
                                    <TableCell className="font-mono">{auth.authorCode}</TableCell>
                                    <TableCell>{auth.authorNm}</TableCell>
                                    <TableCell className="max-w-xs truncate">{auth.authorDc}</TableCell>
                                    <TableCell>{auth.authorCreatDe}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(auth)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" disabled={deleteMutation.isPending} onClick={() => handleDelete(auth.authorCode)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAuthority ? '권한 수정' : '권한 등록'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="authorCode">권한코드</Label>
                            <Input
                                id="authorCode"
                                value={formData.authorCode}
                                onChange={(e) => setFormData(prev => ({ ...prev, authorCode: e.target.value }))}
                                disabled={!!editingAuthority}
                                placeholder="ROLE_ADMIN"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="authorNm">권한명</Label>
                            <Input
                                id="authorNm"
                                value={formData.authorNm}
                                onChange={(e) => setFormData(prev => ({ ...prev, authorNm: e.target.value }))}
                                placeholder="관리자"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="authorDc">설명</Label>
                            <Textarea
                                id="authorDc"
                                value={formData.authorDc}
                                onChange={(e) => setFormData(prev => ({ ...prev, authorDc: e.target.value }))}
                                placeholder="권한에 대한 설명"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
                        <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                            {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            저장
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { Loader2 } from "lucide-react";
