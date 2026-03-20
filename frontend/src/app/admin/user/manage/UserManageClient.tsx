'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { UserManage, UserSearchParams } from '@/types/user';
import { useToast } from '@/app/components/ui/toast';
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Mail, 
  Users, 
  ShieldCheck, 
  Clock, 
  Search,
  Settings2,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { FormField } from '@/app/components/ui/standard-form';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { createUserAction, updateUserAction, deleteUserAction } from '@/app/actions/userActions';
import { useRouter } from 'next/navigation';
import { useMessage } from '@/hooks/useMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

export default function UserManageClient({ initialData, initialParams }: { initialData: any; initialParams: UserSearchParams }) {
  const { t } = useMessage();
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserManage | null>(null);
  const [formData, setFormData] = useState<UserManage>({
    userId: '',
    userNm: '',
    password: '',
    email: '',
    userSttusCode: 'P',
  });

  const users: UserManage[] = initialData?.list || [];
  const [params, setParams] = useState<UserSearchParams>(initialParams);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({ userId: '', userNm: '', password: '', email: '', userSttusCode: 'P' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserManage) => {
    setEditingUser(user);
    setFormData({ ...user, password: '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    const ok = await confirm({
      title: t('common.deleteConfirmTitle') || '사용자 삭제',
      message: t('common.deleteConfirm') || '정말로 이 사용자를 삭제하시겠습니까?',
      variant: 'destructive'
    });
    if (!ok) return;

    setLoading(true);
    try {
      const res = await deleteUserAction(null, userId);
      if (res.success) {
        toast(res.message, 'success');
        router.refresh();
      } else {
        toast(res.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = editingUser ? await updateUserAction(null, formData) : await createUserAction(null, formData);
      if (res.success) {
        toast(res.message, 'success');
        setIsModalOpen(false);
        router.refresh();
      } else {
        toast(res.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'P': return <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800 font-black italic uppercase text-[10px] tracking-widest">{t('admin.user.pending')}</Badge>;
      case 'A': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800 font-black italic uppercase text-[10px] tracking-widest">{t('admin.user.active')}</Badge>;
      case 'D': return <Badge variant="destructive" className="font-black italic uppercase text-[10px] tracking-widest opacity-70">{t('admin.user.disabled')}</Badge>;
      default: return <Badge variant="outline" className="font-black italic uppercase text-[10px] tracking-widest">{status}</Badge>; 
    }
  };

  const columns: Column<UserManage>[] = [
    { 
      header: t('admin.user.userId'), 
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-[9px] shadow-inner italic">ID</div>
          <span className="font-bold tracking-tight text-foreground">{item.userId}</span>
        </div>
      ) 
    },
    { 
      header: t('admin.user.userNm'), 
      accessor: (item) => <span className="font-bold text-foreground italic">{item.userNm}</span> 
    },
    { 
      header: t('admin.user.email'), 
      accessor: (item) => (
        <div className="flex items-center gap-2 text-muted-foreground font-medium italic">
          <Mail size={14} className="opacity-40" />
          <span className="text-sm tracking-tight">{item.email}</span>
        </div>
      ) 
    },
    { 
      header: t('admin.user.sttus'), 
      accessor: (item) => getStatusBadge(item.userSttusCode) 
    },
    {
      header: '액션',
      className: 'text-right',
      accessor: (item) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-9 w-9 rounded-lg hover:bg-muted">
            <Pencil size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.userId)} className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <PageHeader
        title="사용자 디렉토리 매트릭스"
        breadcrumbs={[{ label: '사용자관리' }, { label: '사용자 정보 수정' }]}
        actions={
          <div className="flex gap-4">
             <Button 
                onClick={handleOpenCreate}
                className="h-14 px-8 rounded-2xl font-black italic shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all gap-2"
             >
               <Plus size={20} /> 멤버 추가
             </Button>
             <Button 
                variant="outline"
                className="h-14 px-6 rounded-2xl border-2 font-black italic hover:bg-muted transition-all gap-2"
             >
               <Settings2 size={18} /> 설정
             </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-12 space-y-10">
          {/* Status Overview Card */}
          <div className="bg-slate-900 text-white dark:bg-card dark:text-foreground p-12 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] relative overflow-hidden group">
            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              <div className="w-24 h-24 bg-white/10 dark:bg-primary/5 rounded-[2rem] flex items-center justify-center p-6 backdrop-blur-3xl border border-white/20">
                <Users size={48} className="text-primary-foreground dark:text-primary" />
              </div>
              <div className="space-y-3 flex-1 text-center md:text-left">
                <h2 className="text-4xl font-black italic tracking-tighter leading-none uppercase">Identity Management</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 dark:bg-muted rounded-full text-[10px] font-black tracking-widest uppercase italic">
                    <ShieldCheck size={12} className="text-emerald-400" /> Secure Protocol
                  </div>
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 dark:bg-muted rounded-full text-[10px] font-black tracking-widest uppercase italic">
                    <Clock size={12} className="text-primary" /> Real-time Auth
                  </div>
                </div>
                <p className="text-slate-400 font-bold leading-relaxed max-w-xl italic">
                  시스템의 모든 사용자 계정과 권한을 정밀하게 관리합니다. 보안 정책에 따라 활성화된 세션을 모니터링하고 프로필을 실시간으로 업데이트하십시오.
                </p>
              </div>
              <div className="flex gap-2">
                 <div className="p-6 bg-white/5 dark:bg-muted/50 rounded-3xl border border-white/10 text-center min-w-[120px]">
                    <div className="text-3xl font-black italic">{users.length}</div>
                    <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Total Unit</div>
                 </div>
              </div>
            </div>
            <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-primary/20 blur-[120px] rounded-full opacity-30 group-hover:opacity-50 transition-opacity" />
          </div>

          {/* Filtering & Search Area */}
          <div className="bg-card border-2 border-border p-8 rounded-[2.5rem] shadow-sm flex flex-wrap items-center gap-6">
             <div className="flex-1 relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input 
                  placeholder="SEARCH IDENTITIES..." 
                  value={params.searchKeyword || ''}
                  onChange={e => setParams({...params, searchKeyword: e.target.value})}
                  className="h-14 pl-14 pr-6 rounded-2xl border-none bg-muted/50 font-black italic text-xs tracking-tight focus:ring-4 focus:ring-primary/10 transition-all"
                />
             </div>
             <div className="flex items-center gap-4">
                <div className="h-14 px-6 bg-muted/50 rounded-2xl flex items-center gap-3 border-none">
                   <Filter size={18} className="text-muted-foreground" />
                   <select 
                      value={params.sbscrbSttus || ''} 
                      onChange={e => setParams({...params, sbscrbSttus: e.target.value})}
                      className="bg-transparent text-xs font-black italic outline-none uppercase tracking-widest"
                   >
                      <option value="">Status: All</option>
                      <option value="P">Pending</option>
                      <option value="A">Active</option>
                      <option value="D">Disabled</option>
                   </select>
                </div>
                <Button className="h-14 px-8 rounded-2xl font-black italic shadow-lg hover:scale-105 transition-all">
                  APPLY FILTER
                </Button>
             </div>
          </div>

          {/* Data Table Area */}
          <div className="bg-card border-2 border-border rounded-[3.5rem] shadow-sm p-10 relative overflow-hidden">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-8 bg-primary rounded-full" />
                   <h3 className="text-2xl font-black italic tracking-tighter text-foreground">User Database Stream</h3>
                </div>
             </div>
             <div className="rounded-[2rem] border-2 border-border/10 overflow-hidden">
                <StandardDataTable 
                  columns={columns} 
                  data={users} 
                  emptyMessage="검색 결과가 없습니다."
                />
             </div>
          </div>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? '사용자 프로필 수정' : '신규 사용자 등록'}
        maxWidth="lg"
        footer={
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold">취소</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-[2] h-12 rounded-xl font-black italic tracking-widest shadow-lg">
              {editingUser ? 'UPDATE IDENTITY' : 'REGISTER MEMBER'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6 pt-2">
            <div className="grid grid-cols-2 gap-6">
              <FormField label="아이디" required description="시스템 고유 식별자">
                <Input 
                  value={formData.userId} 
                  onChange={e => setFormData({...formData, userId: e.target.value})} 
                  readOnly={!!editingUser}
                  className="h-12 border-2 focus:border-primary font-black italic tracking-tight bg-muted/10" 
                  placeholder="예: admin"
                />
              </FormField>
              <FormField label="사용자 명칭" required>
                <Input 
                  value={formData.userNm} 
                  onChange={e => setFormData({...formData, userNm: e.target.value})} 
                  className="h-12 border-2 focus:border-primary font-bold italic" 
                  placeholder="실명 입력"
                />
              </FormField>
            </div>

            <FormField label="비밀번호" required={!editingUser} description={editingUser ? "변경시에만 입력하십시오." : "로그인 비밀번호"}>
              <Input 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                className="h-12 border-2 focus:border-primary" 
                placeholder="••••••••"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-6">
              <FormField label="이메일 주소" required>
                <Input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="h-12 border-2 focus:border-primary font-medium" 
                  placeholder="example@egov.com"
                />
              </FormField>
              <FormField label="계정 상태">
                 <select 
                    value={formData.userSttusCode} 
                    onChange={e => setFormData({...formData, userSttusCode: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl border-2 bg-background font-black italic text-xs uppercase tracking-widest focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                 >
                   <option value="P">--- PENDING ---</option>
                   <option value="A">--- ACTIVE ---</option>
                   <option value="D">--- DISABLED ---</option>
                 </select>
              </FormField>
            </div>
        </div>
      </StandardModal>
    </div>
  );
}
