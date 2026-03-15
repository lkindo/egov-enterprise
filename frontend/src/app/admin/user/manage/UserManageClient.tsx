'use client';

import { useState } from 'react';
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
import { Pencil, Trash2, Plus, Mail } from 'lucide-react';
import { ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { useToast } from '@/app/components/ui/toast';
import { createUserAction, updateUserAction, deleteUserAction } from '@/app/actions/userActions';
import { useRouter } from 'next/navigation';
import { useMessage } from '@/hooks/useMessage';
import { StandardAdminLayout } from '@/app/components/layout/StandardAdminLayout';

export default function UserManageClient({ initialData, initialParams }: { initialData: any; initialParams: UserSearchParams }) {
    const { t } = useMessage();
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

    const users: UserManage[] = initialData?.list || [];
    const totalCount: number = initialData?.total ?? 0;
    const currentPage: number = initialData?.page ?? initialParams.pageIndex ?? 1;
    const pageSize: number = initialData?.size ?? 10;

    const handleCreate = () => {
        setEditingUser(null);
        setFormData({ userId: '', userNm: '', password: '', email: '', userSttusCode: 'P' });
        setIsDialogOpen(true);
    };

    const handleEdit = (user: UserManage) => {
        setEditingUser(user);
        setFormData({ ...user, password: '' });
        setIsDialogOpen(true);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm(t('common.deleteConfirm'))) return;
        const res = await deleteUserAction(null, userId);
        if (res.success) {
            toast(res.message, 'success');
            router.refresh();
        } else {
            toast(res.message, 'error');
        }
    };

    const handleSubmit = async () => {
        const res = editingUser ? await updateUserAction(null, formData) : await createUserAction(null, formData);
        if (res.success) {
            toast(res.message, 'success');
            setIsDialogOpen(false);
            router.refresh();
        } else toast(res.message, 'error');
    };

    const handlePageChange = (page: number) => {
        const query = `pageIndex=${page}&searchKeyword=${params.searchKeyword || ''}&searchCondition=${params.searchCondition || '0'}&sbscrbSttus=${params.sbscrbSttus || ''}`;
        router.push(`/admin/user/manage?${query}`);
    };

    const filterFields = [
        { name: 'searchCondition', label: t('admin.user.searchBy'), type: 'select' as const, options: [{ label: t('admin.user.id'), value: '0' }, { label: t('admin.user.name'), value: '1' }] },
        { name: 'searchKeyword', label: t('common.search'), type: 'text' as const, placeholder: t('admin.user.keywordPlaceholder') },
        { name: 'sbscrbSttus', label: t('admin.user.joinStatus'), type: 'select' as const, options: [{ label: t('admin.user.all'), value: '' }, { label: t('admin.user.pending'), value: 'P' }, { label: t('admin.user.active'), value: 'A' }, { label: t('admin.user.disabled'), value: 'D' }] }
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'P': return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 font-black">{t('admin.user.pending')}</Badge>;
            case 'A': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-black">{t('admin.user.active')}</Badge>;
            case 'D': return <Badge variant="destructive" className="font-black opacity-70">{t('admin.user.disabled')}</Badge>;
            default: return <Badge variant="outline" className="font-black">{status}</Badge>;    
        }
    };

    const columns: ColumnDef<UserManage>[] = [
        { id: 'userId', header: t('admin.user.userId'), pinned: 'left', sortable: true, width: 200, accessor: (item) => <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] shadow-inner">ID</div><span className="font-black tracking-tight text-slate-900">{item.userId}</span></div> },
        { id: 'userNm', header: t('admin.user.userNm'), accessor: 'userNm', sortable: true, className: 'font-black text-slate-700' },
        { id: 'email', header: t('admin.user.email'), sortable: true, width: 250, accessor: (item) => <div className="flex items-center gap-2 text-slate-500 font-bold"><Mail size={14} className="opacity-40" /><span className="text-sm tracking-tight">{item.email}</span></div> },
        { id: 'userSttusCode', header: t('admin.user.sttus'), accessor: (item) => getStatusBadge(item.userSttusCode) },
        { id: 'actions', header: t('common.action'), className: 'text-right', accessor: (item) => <div className="flex justify-end gap-2"><Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90" onClick={() => handleEdit(item)}><Pencil size={16} /></Button><Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90" onClick={() => handleDelete(item.userId)}><Trash2 size={16} /></Button></div> }
    ];

    return (
        <StandardAdminLayout
            title={t('admin.user.title')}
            filterFields={filterFields}
            onSearch={(values) => {
                setParams(values);
                const query = `pageIndex=1&searchKeyword=${values.searchKeyword || ''}&searchCondition=${values.searchCondition || '0'}&sbscrbSttus=${values.sbscrbSttus || ''}`;
                router.push(`/admin/user/manage?${query}`);
            }}
            onReset={() => router.push('/admin/user/manage')}
            gridTitle="USER DIRECTORY MASTER"
            columns={columns}
            data={users}
            keyField="userId"
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            actionButton={
                <Button onClick={handleCreate} className="rounded-2xl h-14 px-8 font-black shadow-2xl shadow-primary/20 gap-3 hover:-translate-y-1 transition-all active:scale-95">
                    <Plus size={20} /> {t('admin.user.newUser')}
                </Button>
            }
        >
            {/* Registration/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg rounded-[3rem] border-none p-10 shadow-2xl ring-1 ring-slate-100">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black tracking-tighter italic uppercase flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl">
                                {editingUser ? <Pencil size={24} /> : <Plus size={24} />}        
                            </div>
                            {editingUser ? t('admin.user.updateUser') : t('admin.user.newUser')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-8">
                        <div className="space-y-3">
                            <Label htmlFor="userId" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('admin.user.id')}</Label>
                            <Input id="userId" className="h-14 rounded-2xl border-2 text-lg font-black px-6 focus:ring-primary/20" value={formData.userId} onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))} disabled={!!editingUser} placeholder="example_uid" />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="userNm" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('admin.user.name')}</Label>
                            <Input id="userNm" className="h-14 rounded-2xl border-2 text-lg font-black px-6 focus:ring-primary/20" value={formData.userNm} onChange={(e) => setFormData(prev => ({ ...prev, userNm: e.target.value }))} placeholder="John Doe" />
                        </div>
                        {!editingUser && (
                            <div className="space-y-3">
                                <Label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('login.pwLabel')}</Label>    
                                <Input id="password" type="password" className="h-14 rounded-2xl border-2 text-lg font-black px-6 focus:ring-primary/20" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} />
                            </div>
                        )}
                        <div className="space-y-3">
                            <Label htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('admin.user.email')}</Label>
                            <Input id="email" type="email" className="h-14 rounded-2xl border-2 text-lg font-black px-6 focus:ring-primary/20" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="connect@egov.com" />
                        </div>
                    </div>
                    <DialogFooter className="gap-3 sm:justify-between">
                        <Button variant="outline" className="rounded-2xl h-14 px-10 font-bold border-2" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSubmit} className="rounded-2xl h-14 px-12 font-black shadow-2xl shadow-primary/20 uppercase tracking-widest italic">{t('common.confirm')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </StandardAdminLayout>
    );
}
