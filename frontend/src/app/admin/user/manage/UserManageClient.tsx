'use client';

import { useState, useActionState, useEffect } from 'react';
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
import { Pencil, Trash2, Plus, Users, UserCheck, ShieldAlert, Mail, ChevronLeft } from 'lucide-react';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { SmartSearchPanel } from '@/app/components/ui/standard-search-filter';
import { PageHeader } from '@/app/components/layout/page-header';
import { useToast } from '@/app/components/ui/toast';
import { createUserAction, updateUserAction, deleteUserAction } from '@/app/actions/userActions';
import { useRouter } from 'next/navigation';

export default function UserManageClient({ initialData, initialParams }: { initialData: any; initialParams: UserSearchParams }) {
    const router = useRouter();
    const { toast } = useToast();
    const [params, setParams] = useState<UserSearchParams>(initialParams);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserManage | null>(null);
    const [formData, setFormData] = useState<UserManage>({
        userId: '',
        userNm: '',
        password: '',
        email: '',
        userSttusCode: 'P',
    });

    const users: UserManage[] = initialData?.resultList || [];
    const pagination = initialData?.paginationInfo;

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
        const res = await deleteUserAction(null, userId);
        if (res.success) {
            toast(res.message, 'success');
        } else {
            toast(res.message, 'error');
        }
    };

    const handleSubmit = async () => {
        const res = editingUser
            ? await updateUserAction(null, formData)
            : await createUserAction(null, formData);

        if (res.success) {
            toast(res.message, 'success');
            setIsDialogOpen(false);
        } else {
            toast(res.message, 'error');
        }
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
        }
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'P': return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 font-black">승인대기</Badge>;
            case 'A': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-black">정상</Badge>;
            case 'D': return <Badge variant="destructive" className="font-black opacity-70">탈퇴</Badge>;
            default: return <Badge variant="outline" className="font-black">{status}</Badge>;
        }
    };

    const columns: ColumnDef<UserManage>[] = [
        {
            id: 'userId',
            header: '아이디',
            pinned: 'left',
            sortable: true,
            width: 200,
            accessor: (item: UserManage) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] shadow-inner">
                        ID
                    </div>
                    <span className="font-black tracking-tight text-slate-900">{item.userId}</span>
                </div>
            )
        },
        {
            id: 'userNm',
            header: '성명',
            accessor: 'userNm',
            sortable: true,
            className: 'font-black text-slate-700'
        },
        {
            id: 'email',
            header: '이메일',
            sortable: true,
            width: 250,
            accessor: (item: UserManage) => (
                <div className="flex items-center gap-2 text-slate-500 font-bold">
                    <Mail size={14} className="opacity-40" />
                    <span className="text-sm tracking-tight">{item.email}</span>
                </div>
            )
        },
        {
            id: 'userSttusCode',
            header: '상태',
            accessor: (item: UserManage) => getStatusBadge(item.userSttusCode)
        },
        {
            id: 'actions',
            header: '액션',
            className: 'text-right',
            accessor: (item: UserManage) => (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90" onClick={() => handleEdit(item)}>
                        <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90" onClick={() => handleDelete(item.userId)}>
                        <Trash2 size={16} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PageHeader
                title="사용자 계정 관리"
                breadcrumbs={[{ label: '관리자 서비스' }, { label: '사용자 관리' }]}
                actions={
                    <Button onClick={handleCreate} className="rounded-2xl h-14 px-8 font-black shadow-2xl shadow-primary/20 gap-3 hover:-translate-y-1 transition-all active:scale-95">
                        <Plus size={20} /> 신규 사용자 등록
                    </Button>
                }
            />

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex items-center gap-6 group hover:border-primary/20 transition-all">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-slate-900 text-white flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-all">
                        <Users size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">TOTAL ACCOUNTS</p>
                        <h4 className="text-3xl font-black italic tracking-tighter tabular-nums">{pagination?.totalRecordCount || 0}</h4>
                    </div>
                </div>
                <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex items-center gap-6 group hover:border-orange-200 transition-all">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-orange-600 text-white flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-all">
                        <ShieldAlert size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">PENDING APPROVAL</p>
                        <h4 className="text-3xl font-black italic tracking-tighter tabular-nums text-orange-600">3</h4>
                    </div>
                </div>
                <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex items-center gap-6 group hover:border-emerald-200 transition-all">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-emerald-600 text-white flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-all">
                        <UserCheck size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">ACTIVE RATE</p>
                        <h4 className="text-3xl font-black italic tracking-tighter tabular-nums text-emerald-600">98%</h4>
                    </div>
                </div>
            </div>

            <div className="rounded-[2.5rem] bg-slate-50 border border-slate-100 p-8 shadow-inner">
                <SmartSearchPanel
                    fields={filterFields}
                    onSearch={(values: Record<string, any>) => {
                        const newParams = {
                            ...params,
                            pageIndex: 1,
                            searchCondition: values.searchCondition || '0',
                            searchKeyword: values.searchKeyword || '',
                            sbscrbSttus: values.sbscrbSttus || ''
                        };
                        router.push(`/admin/user/manage?pageIndex=1&searchKeyword=${newParams.searchKeyword}&searchCondition=${newParams.searchCondition}&sbscrbSttus=${newParams.sbscrbSttus}`);
                    }}
                    onReset={() => router.push('/admin/user/manage')}
                />
            </div>

            <div className="rounded-[3rem] bg-white shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-slate-50">
                <UltimateDataGrid
                    title="USER DIRECTORY MASTER"
                    columns={columns}
                    data={users}
                    keyField="userId"
                />
            </div>

            {/* Registration/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg rounded-[3rem] border-none p-10 shadow-2xl ring-1 ring-slate-100">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black tracking-tighter italic uppercase flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl">
                                {editingUser ? <Pencil size={24} /> : <Plus size={24} />}
                            </div>
                            {editingUser ? 'Update Account' : 'Register Member'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-8">
                        <div className="space-y-3">
                            <Label htmlFor="userId" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Account ID</Label>
                            <Input
                                id="userId"
                                className="h-14 rounded-2xl border-2 text-lg font-black px-6 focus:ring-primary/20"
                                value={formData.userId}
                                onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                                disabled={!!editingUser}
                                placeholder="example_uid"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="userNm" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</Label>
                            <Input
                                id="userNm"
                                className="h-14 rounded-2xl border-2 text-lg font-black px-6 focus:ring-primary/20"
                                value={formData.userNm}
                                onChange={(e) => setFormData(prev => ({ ...prev, userNm: e.target.value }))}
                                placeholder="John Doe"
                            />
                        </div>
                        {editingUser === null ? (
                            <div className="space-y-3">
                                <Label htmlFor="password" title="초기 비밀번호" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Initial Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    className="h-14 rounded-2xl border-2 text-lg font-black px-6 focus:ring-primary/20"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                />
                            </div>
                        ) : null}
                        <div className="space-y-3">
                            <Label htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Connection</Label>
                            <Input
                                id="email"
                                type="email"
                                className="h-14 rounded-2xl border-2 text-lg font-black px-6 focus:ring-primary/20"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="connect@egov.com"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-3 sm:justify-between">
                        <Button variant="outline" className="rounded-2xl h-14 px-10 font-bold border-2" onClick={() => setIsDialogOpen(false)}>CANCEL</Button>
                        <Button onClick={handleSubmit} className="rounded-2xl h-14 px-12 font-black shadow-2xl shadow-primary/20 uppercase tracking-widest italic">
                            Confirm Registration
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
