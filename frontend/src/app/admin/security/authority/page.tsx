'use client';

import { useState, useCallback, useEffect } from 'react';

export const dynamic = 'force-dynamic';

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

export default function AuthorityManagePage() {
    const [authorities, setAuthorities] = useState<AuthorManage[]>([]);
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

    const fetchList = useCallback(async () => {
        try {
            const response = await getAuthorList(params);
            if (response && response.resultList) {
                setAuthorities(response.resultList);
            } else {
                setAuthorities([]);
            }
        } catch (error) {
            console.error(error);
            setAuthorities([]);
        }
    }, [params]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

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
        try {
            await deleteAuthor(authorCode);
            fetchList();
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingAuthority) {
                await updateAuthor(formData);
            } else {
                await createAuthor(formData);
            }
            setIsDialogOpen(false);
            fetchList();
        } catch (error) {
            alert('저장 중 오류가 발생했습니다.');
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

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="권한코드 또는 권한명으로 검색"
                    className="max-w-sm"
                    value={params.searchKeyword}
                    onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                />
                <Button onClick={handleSearch}>조회</Button>
            </div>

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
                        {authorities.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            authorities.map((auth, index) => (
                                <TableRow key={auth.authorCode}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-mono">{auth.authorCode}</TableCell>
                                    <TableCell>{auth.authorNm}</TableCell>
                                    <TableCell className="max-w-xs truncate">{auth.authorDc}</TableCell>
                                    <TableCell>{auth.authorCreatDe}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(auth)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(auth.authorCode)}>
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
                        <Button onClick={handleSubmit}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
