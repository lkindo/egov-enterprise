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
import { Trash2, Plus } from "lucide-react";
import { getRoleList, createRole, deleteRole } from '@/services/security/securityService';
import { RoleManage } from '@/types/security';
import { SearchParams } from '@/types/system';

export default function RoleManagePage() {
    const [roles, setRoles] = useState<RoleManage[]>([]);
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchKeyword: '',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<RoleManage>({
        roleCode: '',
        roleNm: '',
        rolePtn: '',
        roleDc: '',
        roleTyp: '',
        roleSort: '',
    });

    const fetchList = useCallback(async () => {
        try {
            const response = await getRoleList(params);
            if (response && response.resultList) {
                setRoles(response.resultList);
            } else {
                setRoles([]);
            }
        } catch (error) {
            console.error(error);
            setRoles([]);
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
        setFormData({
            roleCode: '',
            roleNm: '',
            rolePtn: '',
            roleDc: '',
            roleTyp: 'url',
            roleSort: '1',
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (roleCode: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteRole(roleCode);
            fetchList();
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleSubmit = async () => {
        try {
            await createRole(formData);
            setIsDialogOpen(false);
            fetchList();
        } catch (error) {
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">롤 관리</h2>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    신규 등록
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="롤코드 또는 롤명으로 검색"
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
                            <TableHead>롤코드</TableHead>
                            <TableHead>롤명</TableHead>
                            <TableHead>롤패턴</TableHead>
                            <TableHead>롤타입</TableHead>
                            <TableHead>정렬순서</TableHead>
                            <TableHead className="w-[80px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            roles.map((role, index) => (
                                <TableRow key={role.roleCode}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-mono">{role.roleCode}</TableCell>
                                    <TableCell>{role.roleNm}</TableCell>
                                    <TableCell className="max-w-xs truncate">{role.rolePtn}</TableCell>
                                    <TableCell>{role.roleTyp}</TableCell>
                                    <TableCell>{role.roleSort}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(role.roleCode)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
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
                        <DialogTitle>롤 등록</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="roleCode">롤코드</Label>
                            <Input
                                id="roleCode"
                                value={formData.roleCode}
                                onChange={(e) => setFormData(prev => ({ ...prev, roleCode: e.target.value }))}
                                placeholder="ROLE_USER"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="roleNm">롤명</Label>
                            <Input
                                id="roleNm"
                                value={formData.roleNm}
                                onChange={(e) => setFormData(prev => ({ ...prev, roleNm: e.target.value }))}
                                placeholder="사용자"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rolePtn">롤패턴</Label>
                            <Input
                                id="rolePtn"
                                value={formData.rolePtn}
                                onChange={(e) => setFormData(prev => ({ ...prev, rolePtn: e.target.value }))}
                                placeholder="/user/**"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="roleDc">설명</Label>
                            <Textarea
                                id="roleDc"
                                value={formData.roleDc}
                                onChange={(e) => setFormData(prev => ({ ...prev, roleDc: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="roleTyp">롤타입</Label>
                                <Input
                                    id="roleTyp"
                                    value={formData.roleTyp}
                                    onChange={(e) => setFormData(prev => ({ ...prev, roleTyp: e.target.value }))}
                                    placeholder="url"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="roleSort">정렬순서</Label>
                                <Input
                                    id="roleSort"
                                    value={formData.roleSort}
                                    onChange={(e) => setFormData(prev => ({ ...prev, roleSort: e.target.value }))}
                                    placeholder="1"
                                />
                            </div>
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
