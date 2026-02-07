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
import { getGroupList, createGroup, updateGroup, deleteGroup } from '@/services/security/securityService';
import { GroupManage } from '@/types/security';
import { SearchParams } from '@/types/system';

export default function GroupManagePage() {
    const [groups, setGroups] = useState<GroupManage[]>([]);
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

    const fetchList = useCallback(async () => {
        try {
            const response = await getGroupList(params);
            if (response && response.resultList) {
                setGroups(response.resultList);
            } else {
                setGroups([]);
            }
        } catch (error) {
            console.error(error);
            setGroups([]);
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
        try {
            await deleteGroup(groupId);
            fetchList();
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingGroup) {
                await updateGroup(formData);
            } else {
                await createGroup(formData);
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
                <h2 className="text-2xl font-bold tracking-tight">그룹 관리</h2>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    신규 등록
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="그룹ID 또는 그룹명으로 검색"
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
                            <TableHead>그룹ID</TableHead>
                            <TableHead>그룹명</TableHead>
                            <TableHead>설명</TableHead>
                            <TableHead>등록일</TableHead>
                            <TableHead className="w-[120px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groups.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            groups.map((group, index) => (
                                <TableRow key={group.groupId}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-mono">{group.groupId}</TableCell>
                                    <TableCell>{group.groupNm}</TableCell>
                                    <TableCell className="max-w-xs truncate">{group.groupDc}</TableCell>
                                    <TableCell>{group.groupCreatDe}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(group)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(group.groupId)}>
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
                        <Button onClick={handleSubmit}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
