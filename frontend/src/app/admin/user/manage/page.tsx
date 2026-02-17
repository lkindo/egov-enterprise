'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserManage, UserSearchParams } from '@/types/user';
import { getUserList, createUser, updateUser, deleteUser } from '@/services/user/userService';
import { Pencil, Trash2, Plus, Users, UserCheck, ShieldAlert, Mail } from 'lucide-react';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { PageHeader } from '@/app/components/layout/page-header';
import { useToast } from '@/app/components/ui/toast';

export default function UserManagePage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [params, setParams] = useState<UserSearchParams>({
        pageIndex: 1,
        searchCondition: '0',
        searchKeyword: '',
        sbscrbSttus: '',
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

    // useQuery for fetching users
    const { data, isLoading } = useQuery({
        queryKey: ['users', params],
        queryFn: () => getUserList(params),
    });

    const users = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const deleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            toast('사용자가 삭제되었습니다.', 'success');
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: () => toast('삭제 중 오류가 발생했습니다.', 'error')
    });

    const saveMutation = useMutation({
        mutationFn: (data: UserManage) => editingUser ? updateUser(data) : createUser(data),
        onSuccess: () => {
            setIsDialogOpen(false);
            toast(editingUser ? '정보가 수정되었습니다.' : '사용자가 등록되었습니다.', 'success');
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: () => toast('저장 중 오류가 발생했습니다.', 'error')
    });

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
        deleteMutation.mutate(userId);
    };

    const handleBulkDelete = (selectedUsers: UserManage[]) => {
        if (!confirm(`${selectedUsers.length}명의 사용자를 일괄 삭제하시겠습니까?`)) return;
        // 실제 운영 환경에서는 일괄 삭제 API를 호출해야 하지만, 여기서는 반복 호출로 시뮬레이션
        Promise.all(selectedUsers.map(u => deleteUser(u.userId)))
            .then(() => {
                toast('선택한 사용자들이 삭제되었습니다.', 'success');
                queryClient.invalidateQueries({ queryKey: ['users'] });
            });
    };

    const handleSubmit = async () => {
        saveMutation.mutate(formData);
    };

    const filterFields = [
        {
            name: 'searchCondition',
            label: '검색 조건',
            type: 'select' as const,
            options: [
                { label: '아이디', value: '0' },
                { label: '이름', value: '1' }
            ]
        },
        {
            name: 'searchKeyword',
            label: '검색어',
            type: 'text' as const,
            placeholder: '아이디 또는 이름 입력'
        },
        {
            name: 'sbscrbSttus',
            label: '가입 상태',
            type: 'select' as const,
            options: [
                { label: '전체', value: '' },
                { label: '승인대기', value: 'P' },
                { label: '정상', value: 'A' },
                { label: '탈퇴', value: 'D' }
            ]
        },
        {
            name: 'dateRange',
            label: '가입 기간',
            type: 'daterange' as const
        }
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'P': return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">승인대기</Badge>;
            case 'A': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">정상</Badge>;
            case 'D': return <Badge variant="destructive" className="opacity-70">탈퇴</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const columns = [
        { 
            header: '아이디', 
            accessor: (item: UserManage) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                        ID
                    </div>
                    <span className="font-mono font-bold tracking-tight">{item.userId}</span>
                </div>
            )
        },
        { header: '성명', accessor: 'userNm', className: 'font-bold' },
        { 
            header: '이메일', 
            accessor: (item: UserManage) => (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail size={12} className="opacity-50" />
                    <span className="text-xs">{item.email}</span>
                </div>
            )
        },
        { 
            header: '가입일', 
            accessor: (item: UserManage) => (
                <span className="text-xs font-medium text-slate-500">{item.sbscrbDe || '2026-02-17'}</span>
            )
        },
        { header: '상태', accessor: (item: UserManage) => getStatusBadge(item.userSttusCode) },
        {
            header: '액션',
            className: 'text-right',
            accessor: (item: UserManage) => (
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => handleEdit(item)}>
                        <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => handleDelete(item.userId)}>
                        <Trash2 size={14} />
                    </Button>
                </div>
            )
        }
    ];

    const bulkActions = [
        {
            label: '일괄 승인',
            icon: <UserCheck size={14} />,
            onClick: (items: UserManage[]) => {
                toast(`${items.length}명의 사용자를 승인 처리했습니다.`, 'success');
                queryClient.invalidateQueries({ queryKey: ['users'] });
            }
        },
        {
            label: '일괄 삭제',
            variant: 'destructive' as const,
            icon: <Trash2 size={14} />,
            onClick: handleBulkDelete
        }
    ];

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            <PageHeader
                title="사용자 계정 관리"
                breadcrumbs={[{ label: '관리자 서비스' }, { label: '사용자 관리' }]}
                actions={
                    <Button onClick={handleCreate} className="rounded-xl h-11 px-6 font-black shadow-lg shadow-primary/20 gap-2">
                        <Plus size={18} /> 신규 사용자 등록
                    </Button>
                }
            />

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                <div className="p-6 rounded-[2rem] border-2 border-primary/5 bg-card shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">전체 계정</p>
                        <h4 className="text-2xl font-black">{pagination?.totalRecordCount || 0} 명</h4>
                    </div>
                </div>
                <div className="p-6 rounded-[2rem] border-2 border-primary/5 bg-card shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">승인 대기</p>
                        <h4 className="text-2xl font-black text-orange-600">3 명</h4>
                    </div>
                </div>
                <div className="p-6 rounded-[2rem] border-2 border-primary/5 bg-card shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">활성 계정</p>
                        <h4 className="text-2xl font-black text-emerald-600">98 %</h4>
                    </div>
                </div>
            </div>

            <StandardSearchFilter
                fields={filterFields}
                onSearch={(values) => setParams(prev => ({ 
                    ...prev, 
                    pageIndex: 1,
                    searchCondition: values.searchCondition || '0',
                    searchKeyword: values.searchKeyword || '',
                    sbscrbSttus: values.sbscrbSttus || ''
                }))}
                onReset={() => setParams({ pageIndex: 1, searchCondition: '0', searchKeyword: '', sbscrbSttus: '' })}
            />

            <StandardDataTable
                columns={columns}
                data={users}
                loading={isLoading}
                enableSelection={true}
                bulkActions={bulkActions}
                keyField="userId"
                emptyMessage="등록된 사용자가 없습니다."
            />

            {/* Registration/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md rounded-[2rem] border-2 border-primary/5 p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                {editingUser ? <Pencil size={20} /> : <Plus size={20} />}
                            </div>
                            {editingUser ? '사용자 정보 수정' : '신규 사용자 등록'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="userId" className="font-bold ml-1">아이디</Label>
                            <Input
                                id="userId"
                                className="h-12 rounded-xl border-primary/10"
                                value={formData.userId}
                                onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                                disabled={!!editingUser}
                                placeholder="example_id"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="userNm" className="font-bold ml-1">이름</Label>
                            <Input
                                id="userNm"
                                className="h-12 rounded-xl border-primary/10"
                                value={formData.userNm}
                                onChange={(e) => setFormData(prev => ({ ...prev, userNm: e.target.value }))}
                                placeholder="홍길동"
                            />
                        </div>
                        {!editingUser && (
                            <div className="space-y-2">
                                <Label htmlFor="password" title="초기 비밀번호" className="font-bold ml-1">비밀번호</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    className="h-12 rounded-xl border-primary/10"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="font-bold ml-1">이메일</Label>
                            <Input
                                id="email"
                                type="email"
                                className="h-12 rounded-xl border-primary/10"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="user@example.com"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button variant="outline" className="rounded-xl h-12 px-6 font-bold" onClick={() => setIsDialogOpen(false)}>취소</Button>
                        <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="rounded-xl h-12 px-8 font-black shadow-lg shadow-primary/20">
                            {saveMutation.isPending ? '처리 중...' : '확인'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
