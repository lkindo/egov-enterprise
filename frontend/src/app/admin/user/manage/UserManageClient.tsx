'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { PageResponse } from '@/types/foundation/system';
import { UserManage, UserSearchParams } from '@/types/foundation/user';
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
  Filter,
  UserCheck,
  UserX,
  UserPlus,
  Fingerprint,
  Zap,
  LayoutGrid,
  SearchCode,
  ShieldAlert,
  Settings,
  MoreHorizontal
} from 'lucide-react';
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

export default function UserManageClient({ initialData, initialParams }: { initialData: PageResponse<UserManage>; initialParams: UserSearchParams }) {
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

  const users = initialData?.list || [];
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
      title: '사용자 데이터 영구 삭제',
      message: '해당 사용자 계정 및 연결된 활동 로그 데이터가 모두 삭제됩니다. 정말로 진행하시겠습니까?',
      variant: 'destructive',
      confirmText: '삭제'
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

  const columns: Column<UserManage>[] = [
    {
      header: '사용자 아이디 (Identity)',
      accessor: (item) => (
        <div className="flex items-center gap-5 py-4">
          <div className="w-14 h-14 rounded-[1.25rem] bg-slate-900 flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
            <Fingerprint size={24} className="text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-black tracking-tighter text-foreground text-md uppercase leading-none">{item.userId}</span>
            <span className="text-[9px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase font-mono italic">UID_SYNC_PROBE: {item.userId.length * 7}</span>
          </div>
        </div>
      )
    },
    {
      header: '성명 (Display Name)',
      accessor: (item) => (
        <span className="font-black text-foreground tracking-tight text-sm uppercase">{item.userNm}</span>
      ),
      className: 'w-48'
    },
    {
      header: '커뮤니케이션 엔드포인트',
      accessor: (item) => (
        <div className="flex items-center gap-3 text-muted-foreground font-bold tracking-tighter lowercase">
          <Mail size={14} className="opacity-20" />
          <span className="text-[13px]">{item.email}</span>
        </div>
      )
    },
    {
      header: '인증 상태',
      accessor: (item) => <HubStatusBadge status={item.userSttusCode === 'A' ? '활성' : item.userSttusCode === 'P' ? 'PENDING' : 'DISABLED'} />,
      className: 'w-32'
    },
    {
      header: 'MANAGEMENT',
      className: 'text-right w-32',
      accessor: (item) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-10 w-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl border border-slate-200 transition-all font-black shadow-sm">
            <Settings size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.userId)} className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all shadow-sm">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="전사 사용자 인증 거버넌스"
        breadcrumbs={[{ label: '사용자 관리' }, { label: '사용자 정보' }]}
      />

      <HubHeader
        title="Identity"
        highlight="Fabric"
        subtitle="전사 사용자 계정 자격 증명 및 통합 디렉토리 동기화 프로토콜 제어"
        icon={Users}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
              variant="ghost"
              className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95"
            >
              <Settings2 size={22} className="group-hover:rotate-90 transition-transform duration-500" />
            </Button>
            <Button
              onClick={handleOpenCreate}
              size="lg"
              className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
            >
              <UserPlus size={20} /> 신규 등록
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="ACTIVE_RESOURCES" value={users.filter((u: UserManage) => u.userSttusCode === 'A').length} icon={UserCheck} color="emerald" status="TRUSTED" />
        <HubMetricCard title="PENDING_AUTH" value={users.filter((u: UserManage) => u.userSttusCode === 'P').length} icon={Clock} color="amber" />
        <HubMetricCard title="SECURITY_ALERTS" value={users.filter((u: UserManage) => u.userSttusCode === 'D').length} icon={ShieldAlert} color="rose" />
        <HubMetricCard title="IDENTITY_POOL" value={users.length} icon={Users} color="primary" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        {/* Search Panel */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <div className="rounded-[3.5rem] p-12 bg-slate-900 text-white shadow-2xl relative overflow-hidden group h-full border-none">
            <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
              <ShieldCheck size={240} className="text-primary" />
            </div>
            <div className="relative z-10 space-y-12">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                  <Zap size={32} className="text-primary" />
                </div>
                <h4 className="text-3xl font-black tracking-tighter leading-tight uppercase">인증<br />코어 프로토콜</h4>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 tracking-[0.4em] px-2 uppercase font-mono">Input_Identity_Probe</label>
                  <div className="relative group/search">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-primary transition-colors" size={20} />
                    <input
                      onChange={(e) => setParams({ ...params, searchKeyword: e.target.value })}
                      className="w-full h-16 pl-16 pr-8 bg-white/5 border-2 border-white/5 rounded-2xl focus:border-primary/50 focus:bg-white/10 transition-all text-xs font-black tracking-widest text-white outline-none placeholder:text-white/10 uppercase"
                      placeholder="사용자명 또는 고유 ID"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 tracking-[0.4em] px-2 uppercase font-mono">Status_Filter_Mask</label>
                  <select
                    onChange={(e) => setParams({ ...params, sbscrbSttus: e.target.value })}
                    className="w-full h-16 px-8 bg-white/5 border-2 border-white/5 rounded-2xl focus:border-primary/50 focus:bg-white/10 transition-all text-[10px] font-black tracking-widest text-white outline-none appearance-none cursor-pointer uppercase"
                  >
                    <option value="" className="bg-slate-900">--- ALL_ENTITIES (전체) ---</option>
                    <option value="P" className="bg-slate-900 text-amber-500">--- PENDING (승인대기) ---</option>
                    <option value="A" className="bg-slate-900 text-emerald-500">--- ACTIVE_LIVE (활성) ---</option>
                    <option value="D" className="bg-slate-900 text-rose-500">--- BLOCKED (비활성) ---</option>
                  </select>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic uppercase opacity-60 max-w-[180px]">
                  * 다요소인증(MFA) 적용 계정입니다.
                </p>
                <Button variant="ghost" className="h-10 px-4 rounded-xl bg-white/5 text-primary text-[9px] font-black tracking-widest uppercase hover:bg-primary hover:text-white transition-all">조회</Button>
              </div>
            </div>
          </div>
        </div>

        {/* User Identity Stream */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          <HubSectionCard
            title="사용자 아이덴티티 스트림 인벤토리"
            description="전사 통합 디렉토리에 등록된 모든 사용자 개체의 보안 속성 및 인증 상태 관리 명세입니다."
            icon={SearchCode}
          >
            <div className="overflow-hidden">
              <StandardDataTable<UserManage>
                columns={columns}
                data={users}
                emptyMessage="조회된 사용자 데이터가 데이터베이스 스트림에 존재하지 않습니다."
                className="border-none bg-transparent"
              />
            </div>
          </HubSectionCard>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? '사용자 아키텍처 명세 수정' : '신규 아이덴티티 프로비저닝'}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">취소</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl shadow-primary/30 hover:bg-primary transition-all hover:-translate-y-2 group">
              <Zap size={18} className="group-hover:animate-pulse" /> 실행
            </Button>
          </div>
        }
      >
        <div className="space-y-10 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="사용자 고유 식별 명칭" required description="시스템 접근을 위한 고유 액세스 토큰">
              <div className="relative group/id">
                <Fingerprint size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity" />
                <Input
                  value={formData.userId || ''}
                  onChange={e => setFormData({ ...formData, userId: e.target.value })}
                  readOnly={!!editingUser}
                  className="h-16 pl-16 rounded-2xl border-2 text-md font-black tracking-tighter shadow-inner bg-slate-50/50"
                  placeholder="사용자 식별자"
                />
              </div>
            </FormField>
            <FormField label="사용자 성명 (Canonical Name)" required>
              <div className="relative group/name">
                <UserPlus size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/name:opacity-100 transition-opacity" />
                <Input
                  value={formData.userNm || ''}
                  onChange={e => setFormData({ ...formData, userNm: e.target.value })}
                  className="h-16 pl-16 rounded-2xl border-2 text-md font-black tracking-tight shadow-inner"
                  placeholder="표시 이름"
                />
              </div>
            </FormField>
          </div>

          <FormField label="인증 크리덴셜 (Credential Phase)" required={!editingUser} description={editingUser ? "보안 강화를 위해 필요시에만 변경하십시오." : "보안 강도가 높은 복합 비밀번호를 권장합니다."}>
            <div className="relative group/pw">
              <ShieldCheck size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/pw:opacity-100 transition-opacity" />
              <Input
                type="password"
                value={formData.password || ''}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="h-16 pl-16 rounded-2xl border-2 text-sm font-black tracking-widest shadow-inner py-4"
                placeholder="••••••••••••••••"
              />
            </div>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="커뮤니케이션 엔드포인트" required>
              <div className="relative group/email">
                <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/email:opacity-100 transition-opacity" />
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="h-14 pl-14 rounded-2xl border-2 font-black tracking-tighter text-xs shadow-inner lowercase"
                  placeholder="이메일 주소"
                />
              </div>
            </FormField>
            <FormField label="아이덴티티 로드 프로토콜">
              <select
                value={formData.userSttusCode || ''}
                onChange={e => setFormData({ ...formData, userSttusCode: e.target.value })}
                className="w-full h-14 px-6 rounded-2xl border-2 bg-slate-50 font-black text-[10px] uppercase tracking-widest focus:ring-4 focus:ring-primary/10 outline-none transition-all cursor-pointer shadow-inner"
              >
                <option value="P">--- 대기 중 (비승인 대기) ---</option>
                <option value="A">--- 활성 (정상) ---</option>
                <option value="D">--- 비활성 (차단) ---</option>
              </select>
            </FormField>
          </div>

          <div className="p-8 rounded-[2rem] bg-indigo-50/30 border-2 border-indigo-100/50 flex items-start gap-4">
            <ShieldCheck className="text-indigo-500 mt-1 shrink-0" size={20} />
            <div className="space-y-1">
              <h6 className="text-[10px] font-black text-indigo-900 tracking-widest">암호화 정책 활성</h6>
              <p className="text-[10px] font-bold text-indigo-700/60 leading-relaxed">사용자 생성 및 수정 시 모든 개인정보는 AES-256 규격으로 암호화되어 저장됩니다.</p>
            </div>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
