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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";
import { getUserList, createUser, updateUser, deleteUser } from '@/services/user/userService';
import { UserManage, UserSearchParams } from '@/types/user';

export default function UserManagePage() {
    const [users, setUsers] = useState<UserManage[]>([]);
    const [params, setParams] = useState<UserSearchParams>({
        pageIndex: 1,
        searchCondition: '0',
        searchKeyword: '',
        sbscrbSttus: 'P',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserManage | null>(null);
    const [formData, setFormData] = useState<UserManage>({
        userId: '',
        userNm: '',
        password: '',
        email: '',
        userSttusCode: 'P',
    });

    const fetchList = useCallback(async () => {
        try {
            const response = await getUserList(params);
            if (response && response.resultList) {
                setUsers(response.resultList);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error(error);
            setUsers([]);
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
        setEditingUser(null);
        setFormData({
            userId: '',
            userNm: '',
            password: '',
            email: '',
            userSttusCode: 'P',
        });
        setIsDialogOpen(true);
    };

    const handleEdit = (user: UserManage) => {
        setEditingUser(user);
        setFormData({ ...user, password: '' });
        setIsDialogOpen(true);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteUser(userId);
            fetchList();
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingUser) {
                await updateUser(formData);
            } else {
                await createUser(formData);
            }
            setIsDialogOpen(false);
            fetchList();
        } catch (error) {
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'P': return <Badge variant="default">승인대기</Badge>;
            case 'A': return <Badge variant="secondary">정상</Badge>;
            case 'D': return <Badge variant="destructive">탈퇴</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">사용자 관리</h2>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    신규 등록
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Select
                    value={params.searchCondition}
                    onValueChange={(value) => setParams(prev => ({ ...prev, searchCondition: value }))}
                >
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="검색조건" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">아이디</SelectItem>
                        <SelectItem value="1">이름</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    placeholder="검색어를 입력하세요"
                    className="max-w-sm"
                    value={params.searchKeyword}
                    onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                />
                <Select
                    value={params.sbscrbSttus}
                    onValueChange={(value) => setParams(prev => ({ ...prev, sbscrbSttus: value }))}
                >
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="상태" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">전체</SelectItem>
                        <SelectItem value="P">승인대기</SelectItem>
                        <SelectItem value="A">정상</SelectItem>
                        <SelectItem value="D">탈퇴</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleSearch}>조회</Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">순번</TableHead>
                            <TableHead>아이디</TableHead>
                            <TableHead>이름</TableHead>
                            <TableHead>이메일</TableHead>
                            <TableHead>가입일</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead className="w-[120px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user, index) => (
                                <TableRow key={user.userId}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-mono">{user.userId}</TableCell>
                                    <TableCell>{user.userNm}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.sbscrbDe}</TableCell>
                                    <TableCell>{getStatusBadge(user.userSttusCode)}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(user.userId)}>
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? '사용자 수정' : '사용자 등록'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="userId">아이디</Label>
                            <Input
                                id="userId"
                                value={formData.userId}
                                onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                                disabled={!!editingUser}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="userNm">이름</Label>
                            <Input
                                id="userNm"
                                value={formData.userNm}
                                onChange={(e) => setFormData(prev => ({ ...prev, userNm: e.target.value }))}
                            />
                        </div>
                        {!editingUser && (
                            <div className="space-y-2">
                                <Label htmlFor="password">비밀번호</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="moblphonNo">휴대전화</Label>
                            <Input
                                id="moblphonNo"
                                value={formData.moblphonNo || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, moblphonNo: e.target.value }))}
                                placeholder="010-0000-0000"
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
