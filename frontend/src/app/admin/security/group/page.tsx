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
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { getGroupList, createGroup, updateGroup, deleteGroup } from '@/services/security/securityService';
import { GroupManage } from '@/types/security';
import { SearchParams } from '@/types/system';
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PagePagination } from "@/components/common/PagePagination";

export default function GroupManagePage() {
    const queryClient = useQueryClient();
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchKeyword: '',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<GroupManage | null>(null);
    const [formData, setFormData] = useState<GroupManage>({
        groupId: '',
        groupNm: '',
        groupDc: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-groups', params],
        queryFn: () => getGroupList(params),
    });

    const groups = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const createMutation = useMutation({
        mutationFn: createGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
            setIsDialogOpen(false);
        },
        onError: () => alert('저장 중 오류가 발생했습니다.')
    });

    const updateMutation = useMutation({
        mutationFn: updateGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
            setIsDialogOpen(false);
        },
        onError: () => alert('저장 중 오류가 발생했습니다.')
    });

    const deleteMutation = useMutation({
        mutationFn: deleteGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
        },
        onError: () => alert('삭제 중 오류가 발생했습니다.')
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const handleCreate = () => {
        setEditingGroup(null);
        setFormData({ groupId: '', groupNm: '', groupDc: '' });
        setIsDialogOpen(true);
    };

    const handleEdit = (group: GroupManage) => {
        setEditingGroup(group);
        setFormData(group);
        setIsDialogOpen(true);
    };

    const handleDelete = async (groupId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        deleteMutation.mutate(groupId);
    };

    const handleSubmit = async () => {
        if (editingGroup) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">그룹 관리</h2>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    신규 등록
                </Button>
            </div>

            <form onSubmit={handleSearch} className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="그룹ID 또는 그룹명으로 검색"
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
                            <TableHead>그룹ID</TableHead>
                            <TableHead>그룹명</TableHead>
                            <TableHead>설명</TableHead>
                            <TableHead>등록일</TableHead>
                            <TableHead className="w-[120px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableSkeleton columnCount={6} rowCount={10} />
                        ) : groups.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            groups.map((group, index) => (
                                <TableRow key={group.groupId}>
                                    <TableCell>{index + 1 + ((params.pageIndex || 1) - 1) * 10}</TableCell>
                                    <TableCell className="font-mono">{group.groupId}</TableCell>
                                    <TableCell>{group.groupNm}</TableCell>
                                    <TableCell className="max-w-xs truncate">{group.groupDc}</TableCell>
                                    <TableCell>{group.groupCreatDe}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(group)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" disabled={deleteMutation.isPending} onClick={() => handleDelete(group.groupId)}>
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
                        <DialogTitle>{editingGroup ? '그룹 수정' : '그룹 등록'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="groupId">그룹ID</Label>
                            <Input
                                id="groupId"
                                value={formData.groupId}
                                onChange={(e) => setFormData(prev => ({ ...prev, groupId: e.target.value }))}
                                disabled={!!editingGroup}
                                placeholder="GROUP_001"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="groupNm">그룹명</Label>
                            <Input
                                id="groupNm"
                                value={formData.groupNm}
                                onChange={(e) => setFormData(prev => ({ ...prev, groupNm: e.target.value }))}
                                placeholder="개발팀"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="groupDc">설명</Label>
                            <Textarea
                                id="groupDc"
                                value={formData.groupDc}
                                onChange={(e) => setFormData(prev => ({ ...prev, groupDc: e.target.value }))}
                                placeholder="그룹에 대한 설명"
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
