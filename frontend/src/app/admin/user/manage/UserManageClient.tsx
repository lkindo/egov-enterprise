
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
    emailAdres: '',
    userSttusCode: 'P',
  });

  const users = initialData?.list || [];
  const [params, setParams] = useState<UserSearchParams>(initialParams);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({ userId: '', userNm: '', password: '', emailAdres: '', userSttusCode: 'P' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserManage) => {
    setEditingUser(user);
    setFormData({ ...user, password: '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    const ok = await confirm({
      title: '?ъ슜???곗씠???곴뎄 ??젣',
      message: '?대떦 ?ъ슜??怨꾩젙 諛??곌껐???쒕룞 濡쒓렇 ?곗씠?곌? 紐⑤몢 ??젣?⑸땲?? ?뺣쭚濡?吏꾪뻾?섏떆寃좎뒿?덇퉴?',
      variant: 'destructive',
      confirmText: '??젣'
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
      header: '?ъ슜???꾩씠??(Identity)',
      accessor: (item) => (
        <div className="flex items-center gap-5 py-4">
          <div className="w-14 h-14 rounded-[0.1rem] bg-slate-900 flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:rotate-6 transition duration-500">
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
      header: '?깅챸 (Display Name)',
      accessor: (item) => (
        <span className="font-black text-foreground tracking-tight text-sm uppercase">{item.userNm}</span>
      ),
      className: 'w-48'
    },
    {
      header: '而ㅻ??덉??댁뀡 ?붾뱶?ъ씤??,
      accessor: (item) => (
        <div className="flex items-center gap-3 text-slate-700 font-bold tracking-tighter lowercase">
          <Mail size={14} className="text-slate-400" />
          <span className="text-[13px]">{item.emailAdres}</span>
        </div>
      )
    },
    {
      header: '?몄쬆 ?곹깭',
      accessor: (item) => <HubStatusBadge status={item.userSttusCode === 'A' ? '?쒖꽦' : item.userSttusCode === 'P' ? 'PENDING' : 'DISABLED'} />,
      className: 'w-32'
    },
    {
      header: 'MANAGEMENT',
      className: 'text-right w-32',
      accessor: (item) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-10 w-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-[0.1rem] border border-slate-200 transition font-black shadow-sm">
            <Settings size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.userId)} className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-[0.1rem] transition shadow-sm">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="?꾩궗 ?ъ슜???몄쬆 嫄곕쾭?뚯뒪"
        breadcrumbs={[{ label: '?ъ슜??愿由? }, { label: '?ъ슜???뺣낫' }]}
      />

      <HubHeader
        title="Identity"
        highlight="Fabric"
        subtitle="?꾩궗 ?ъ슜??怨꾩젙 ?먭꺽 利앸챸 諛??듯빀 ?붾젆?좊━ ?숆린???꾨줈?좎퐳 ?쒖뼱"
        icon={Users}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
              variant="ghost"
              className="h-14 w-14 rounded-[0.1rem] bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition shadow-xl group active:scale-95"
            >
              <Settings2 size={22} className="group-hover:rotate-90 transition-transform duration-500" />
            </Button>
            <Button
              onClick={handleOpenCreate}
              size="lg"
              className="h-14 px-10 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition hover:-translate-y-1 gap-3"
            >
              <UserPlus size={20} /> ?좉퇋 ?깅줉
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
          <div className="rounded-[0.1rem] p-12 bg-slate-900 text-white shadow-2xl relative overflow-hidden group h-full border-none">
            <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
              <ShieldCheck size={240} className="text-primary" />
            </div>
            <div className="relative z-10 space-y-12">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-[0.1rem] bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                  <Zap size={32} className="text-primary" />
                </div>
                <h4 className="text-3xl font-black tracking-tighter leading-tight uppercase">?몄쬆<br />肄붿뼱 ?꾨줈?좎퐳</h4>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label htmlFor="user-search-input" className="text-[10px] font-black text-white/70 tracking-[0.4em] px-2 uppercase font-mono">Input_Identity_Probe</label>
                  <div className="relative group/search">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/60 group-focus-within/search:text-primary transition-colors" size={20} aria-hidden="true" />
                    <input
                      id="user-search-input"
                      onChange={(e) => setParams({ ...params, searchKeyword: e.target.value })}
                      className="w-full h-16 pl-16 pr-8 bg-white/10 border-2 border-white/20 rounded-[0.1rem] focus:border-primary/50 focus:bg-white/20 transition text-xs font-black tracking-widest text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 placeholder:text-white/40 uppercase"
                      placeholder="?ъ슜?먮챸 ?먮뒗 怨좎쑀 ID"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label htmlFor="user-status-filter" className="text-[10px] font-black text-white/70 tracking-[0.4em] px-2 uppercase font-mono">Status_Filter_Mask</label>
                  <select
                    id="user-status-filter"
                    onChange={(e) => setParams({ ...params, sbscrbSttus: e.target.value })}
                    className="w-full h-16 px-8 bg-white/10 border-2 border-white/20 rounded-[0.1rem] focus:border-primary/50 focus:bg-white/20 transition text-[10px] font-black tracking-widest text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 appearance-none cursor-pointer uppercase"
                  >
                    <option value="" className="bg-slate-900">--- ALL_ENTITIES (?꾩껜) ---</option>
                    <option value="P" className="bg-slate-900 text-amber-500">--- PENDING (?뱀씤?湲? ---</option>
                    <option value="A" className="bg-slate-900 text-emerald-500">--- ACTIVE_LIVE (?쒖꽦) ---</option>
                    <option value="D" className="bg-slate-900 text-rose-500">--- BLOCKED (鍮꾪솢?? ---</option>
                  </select>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic uppercase max-w-[180px]">
                  * ?ㅼ슂?뚯씤利?MFA) ?곸슜 怨꾩젙?낅땲??
                </p>
                <Button variant="ghost" className="h-10 px-4 rounded-[0.1rem] bg-white/5 text-primary text-[9px] font-black tracking-widest uppercase hover:bg-primary hover:text-white transition">議고쉶</Button>
              </div>
            </div>
          </div>
        </div>

        {/* User Identity Stream */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          <HubSectionCard
            title="?ъ슜???꾩씠?댄떚???ㅽ듃由??몃깽?좊━"
            description="?꾩궗 ?듯빀 ?붾젆?좊━???깅줉??紐⑤뱺 ?ъ슜??媛쒖껜??蹂댁븞 ?띿꽦 諛??몄쬆 ?곹깭 愿由?紐낆꽭?낅땲??"
            icon={SearchCode}
          >
            <div className="overflow-hidden">
              <StandardDataTable<UserManage>
                columns={columns}
                data={users}
                emptyMessage="議고쉶???ъ슜???곗씠?곌? ?곗씠?곕쿋?댁뒪 ?ㅽ듃由쇱뿉 議댁옱?섏? ?딆뒿?덈떎."
                className="border-none bg-transparent"
              />
            </div>
          </HubSectionCard>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? '?ъ슜???꾪궎?띿쿂 紐낆꽭 ?섏젙' : '?좉퇋 ?꾩씠?댄떚???꾨줈鍮꾩???}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-[0.1rem] font-black text-[10px] tracking-widest border-2">痍⑥냼</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-[2] h-14 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl shadow-primary/30 hover:bg-primary transition hover:-translate-y-2 group">
              <Zap size={18} className="group-hover:animate-pulse" /> ?ㅽ뻾
            </Button>
          </div>
        }
      >
        <div className="space-y-10 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField 
              label="?ъ슜??怨좎쑀 ?앸퀎 紐낆묶" 
              htmlFor="userId" 
              required 
              description="?쒖뒪???묎렐???꾪븳 怨좎쑀 ?≪꽭???좏겙"
            >
              <div className="relative group/id">
                <Fingerprint size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity" />
                <Input
                  id="userId"
                  value={formData.userId || ''}
                  onChange={e => setFormData({ ...formData, userId: e.target.value })}
                  readOnly={!!editingUser}
                  aria-required="true"
                  aria-describedby="userId-description"
                  className="h-16 pl-16 rounded-[0.1rem] border-2 text-md font-black tracking-tighter shadow-inner bg-slate-50/50"
                  placeholder="?ъ슜???앸퀎??
                />
              </div>
            </FormField>
            <FormField label="?ъ슜???깅챸 (Canonical Name)" htmlFor="userNm" required>
              <div className="relative group/name">
                <UserPlus size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/name:opacity-100 transition-opacity" />
                <Input
                  id="userNm"
                  value={formData.userNm || ''}
                  onChange={e => setFormData({ ...formData, userNm: e.target.value })}
                  aria-required="true"
                  className="h-16 pl-16 rounded-[0.1rem] border-2 text-md font-black tracking-tight shadow-inner"
                  placeholder="?쒖떆 ?대쫫"
                />
              </div>
            </FormField>
          </div>

          <FormField 
            label="?몄쬆 ?щ━?댁뀥 (Credential Phase)" 
            htmlFor="password" 
            required={!editingUser} 
            description={editingUser ? "蹂댁븞 媛뺥솕瑜??꾪빐 ?꾩슂?쒖뿉留?蹂寃쏀븯??떆??" : "蹂댁븞 媛뺣룄媛 ?믪? 蹂듯빀 鍮꾨?踰덊샇瑜?沅뚯옣?⑸땲??"}
          >
            <div className="relative group/pw">
              <ShieldCheck size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/pw:opacity-100 transition-opacity" />
              <Input
                id="password"
                type="password"
                value={formData.password || ''}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                aria-required={!editingUser}
                aria-describedby="password-description"
                className="h-16 pl-16 rounded-[0.1rem] border-2 text-sm font-black tracking-widest shadow-inner py-4"
                placeholder="?™™™™™™™™™™™™™™™?
              />
            </div>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="而ㅻ??덉??댁뀡 ?붾뱶?ъ씤?? required>
              <div className="relative group/email">
                <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/email:opacity-100 transition-opacity" />
                <Input
                  type="email"
                  value={formData.emailAdres || ''}
                  onChange={e => setFormData({ ...formData, emailAdres: e.target.value })}
                  className="h-14 pl-14 rounded-[0.1rem] border-2 font-black tracking-tighter text-xs shadow-inner lowercase"
                  placeholder="?대찓??二쇱냼"
                />
              </div>
            </FormField>
            <FormField label="?꾩씠?댄떚??濡쒕뱶 ?꾨줈?좎퐳">
              <select
                value={formData.userSttusCode || ''}
                onChange={e => setFormData({ ...formData, userSttusCode: e.target.value })}
                className="w-full h-14 px-6 rounded-[0.1rem] border-2 bg-slate-50 font-black text-[10px] uppercase tracking-widest focus:ring-4 focus:ring-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition cursor-pointer shadow-inner"
              >
                <option value="P">--- ?湲?以?(鍮꾩듅???湲? ---</option>
                <option value="A">--- ?쒖꽦 (?뺤긽) ---</option>
                <option value="D">--- 鍮꾪솢??(李⑤떒) ---</option>
              </select>
            </FormField>
          </div>

          <div className="p-8 rounded-[0.1rem] bg-indigo-50/30 border-2 border-indigo-100/50 flex items-start gap-4">
            <ShieldCheck className="text-indigo-500 mt-1 shrink-0" size={20} />
            <div className="space-y-1">
              <h6 className="text-[10px] font-black text-indigo-900 tracking-widest">?뷀샇???뺤콉 ?쒖꽦</h6>
              <p className="text-[10px] font-bold text-indigo-700/60 leading-relaxed">?ъ슜???앹꽦 諛??섏젙 ??紐⑤뱺 媛쒖씤?뺣낫??AES-256 洹쒓꺽?쇰줈 ?뷀샇?붾릺????λ맗?덈떎.</p>
            </div>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
