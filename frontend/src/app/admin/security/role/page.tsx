'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Plus,
  Trash2,
  ShieldCheck,
  Lock,
  Activity,
  Search,
  RefreshCcw,
  Zap,
  ArrowUpRight,
  Database,
  LayoutGrid,
  Box,
  Binary,
  Workflow,
  Network,
  SearchCode,
  Building2,
  Contact2,
  Fingerprint,
  RotateCcw,
  ShieldAlert,
  Globe,
  Layers,
  Milestone,
  ArrowRightCircle,
  Monitor,
  Settings,
  Calendar,
  ListOrdered,
  Key
} from "lucide-react";
import { roleAdminService } from '@/services/foundation/system/RoleAdminService';
import { RoleManage } from '@/types/foundation/security';
import { SearchParams } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PagePagination } from "@/components/common/PagePagination";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField } from '@/app/components/ui/standard-form';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoleManagePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [params, setParams] = useState<SearchParams>({
    page踰덊샇: 1,
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

  const { data, isLoading } = useQuery({
    queryKey: ['admin-roles', params],
    queryFn: () => roleAdminService.getRoleList(params),
    staleTime: 5 * 60 * 1000,
  });

  const roles: RoleManage[] = data?.list || [];
  const pagination = data ? {
    currentPageNo: data.page,
    recordCountPerPage: data.size,
    totalRecordCount: data.total,
    totalPageCount: data.totalPage
  } : null;

  const createMutation = useMutation({
    mutationFn: (data: RoleManage) => roleAdminService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setIsDialogOpen(false);
      toast('신규 ?몃텇님보안 濡?Role)님?깃났?곸쑝濡님ㅼ옣?섏뿀?듬땲님', 'success');
    },
    onError: () => toast('濡님앹꽦 以님쒖뒪님?덉쇅媛 諛쒖깮?덉뒿?덈떎.', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: (roleCode: string) => roleAdminService.deleteRole(roleCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast('보안 濡님꾨줈?꾩씠 ?곴뎄?곸쑝濡님뚭린?섏뿀?듬땲님', 'success');
    },
    onError: () => toast('님젣 泥섎━ 以님쒖뒪님?덉쇅媛 諛쒖깮?덉뒿?덈떎.', 'error')
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(prev => ({ ...prev, page踰덊샇: 1 }));
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
    if (!confirm('?대떦 보안 濡ㅼ쓣 님젣?섏떆寃좎뒿?덇퉴? ?쒖뒪님?묎렐 ?쒖뼱님利됯컖 ?곹뼢님誘몄묩?덈떎.')) return;
    deleteMutation.mutate(roleCode);
  };

  const handleSubmit = async () => {
    createMutation.mutate(formData);
  };

  const columns: Column<RoleManage>[] = [
    {
      header: '보안 濡님꾨줈?좎퐳',
      accessor: (item: RoleManage) => (
        <div className="flex items-center gap-4 py-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-all duration-500">
            <Lock size={18} className="text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.4em] uppercase font-mono italic leading-none mb-1">ROLE_UID</span>
            <span className="font-mono text-xs font-black text-foreground tracking-widest uppercase">{item.roleCode}</span>
          </div>
        </div>
      ),
      className: 'w-64'
    },
    {
      header: '濡?紐낆꽭 (Architecture)',
      accessor: (item: RoleManage) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-black text-foreground tracking-tight text-md uppercase leading-none mb-1">{item.roleNm}</span>
          <div className="flex items-center gap-2">
            <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{item.roleTyp}</span>
            <span className="text-[9px] font-bold text-muted-foreground/40 truncate block max-w-[200px] italic leading-none">{item.rolePtn}</span>
          </div>
        </div>
      )
    },
    {
      header: 'RANK',
      accessor: (item: RoleManage) => (
        <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 font-mono tracking-tighter">
          <ListOrdered size={12} className="opacity-40" />
          {item.roleSort || '0'}
        </div>
      ),
      className: 'w-32'
    },
    {
      header: 'MANAGEMENT',
      className: 'text-right w-32',
      accessor: (item: RoleManage) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button variant="ghost" size="icon" disabled={deleteMutation.isPending} onClick={() => handleDelete(item.roleCode)} className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all shadow-sm">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="?몃텇님보안 濡?Role) ?꾪궎?띿쿂"
        breadcrumbs={[{ label: '보안愿由? }, { label: '濡ㅺ?由? }]}
      />

      <HubHeader
        title="Access"
        highlight="Control"
        subtitle="由ъ냼님?섏님님뺣님님묎렐 ?쒖뼱瑜님꾪븳 보안 濡님⑦꽩 諛님寃님붾뱶?ъ씤님嫄곕쾭?뚯뒪"
        icon={ShieldCheck}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
              variant="ghost"
              onClick={() => queryClient.invalidateQueries()}
              className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95 px-4"
            >
              <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            </Button>
            <Button
              onClick={handleCreate}
              className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
            >
              <Plus size={20} className="group-hover:scale-110 transition-transform duration-500" /> 신규 보안 濡님ㅼ옣
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="濡님뺤쓽" value={roles.length} icon={Database} color="indigo" />
        <HubMetricCard title="?⑦꽩 노드" value={pagination?.totalRecordCount || 0} icon={Layers} color="primary" />
        <HubMetricCard title="?꾨줈釉님곹깭" value="?뺤긽" icon={Activity} color="emerald" status="?숆린?붾맖" />
        <HubMetricCard title="沅뚰븳 ?먮쫫" value="?뺤씤님 icon={Workflow} color="amber" />
      </HubMetricGrid>

      <HubSectionCard
        title="보안 濡님⑦꽩 留ㅽ듃由?뒪"
        description="?쒖뒪님?붾뱶?ъ씤님諛?URL ?⑦꽩 湲곕컲님?뺣? 보안 ?쒖뼱 紐낆꽭 諛님몃깽?좊━?낅땲님"
        icon={SearchCode}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-10 mb-8">
            <div className="flex items-center gap-8">
              <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
                <Input
                  placeholder="濡?肄붾뱶 ?먮뒗 洹쒖튃 紐낆묶?쇰줈 분석..."
                  className="w-[450px] h-16 pl-16 rounded-2xl border-2 bg-slate-50/50 text-sm font-black tracking-tight shadow-inner"
                  value={params.searchKeyword || ''}
                  onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                />
                <Button type="submit" className="h-16 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-1">?⑦꽩 분석</Button>
              </form>
            </div>
            <div>
              <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.4em] uppercase font-mono italic">湲곕뒫님님븷 ?뚯씠釉님꾨줈釉?/span>
            </div>
          </div>

          <div className="min-h-[500px]">
            <StandardDataTable
              columns={columns}
              data={roles}
              loading={isLoading}
              emptyMessage="?앸퀎님보안 濡님⑦꽩 由ъ냼?ㅺ? 議댁옱?섏? ?딆뒿?덈떎."
              className="border-none bg-transparent"
            />
          </div>

          {pagination && (
            <div className="mt-12 flex justify-center">
              <PagePagination
                pagination={pagination}
                onPageChange={(page) => setParams(prev => ({ ...prev, page踰덊샇: page }))}
              />
            </div>
          )}
        </div>
      </HubSectionCard>

      {/* Role Provisioning Modal */}
      <StandardModal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="신규 ?몃텇님보안 濡님ㅼ옣"
        maxWidth="xl"
      >
        <div className="p-4 space-y-12">
          <div className="grid grid-cols-2 gap-10">
            <FormField label="보안 濡님앸퀎님(Role Code)" required description="보안 ?덉씠님?댁뿉님?좎씪님洹쒖튃 ?앸퀎님>
              <div className="relative group/id">
                <Key size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity" />
                <Input
                  id="roleCode"
                  value={formData.roleCode || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleCode: e.target.value }))}
                  className="h-16 pl-16 rounded-2xl border-2 text-md font-black italic tracking-widest uppercase shadow-inner"
                  placeholder="濡님앸퀎님
                />
              </div>
            </FormField>
            <FormField label="濡님덉씠釉?紐낆묶" required description="보안 ?꾩뭅?대툕?먯꽌 ?앸퀎님洹쒖튃 紐낆묶">
              <div className="relative group/nm">
                <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/nm:opacity-100 transition-opacity" />
                <Input
                  id="roleNm"
                  value={formData.roleNm || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleNm: e.target.value }))}
                  className="h-16 pl-16 rounded-2xl border-2 text-md font-black tracking-tight shadow-inner"
                  placeholder="濡?紐낆묶 ?낅젰"
                />
              </div>
            </FormField>
          </div>

          <FormField label="?묎렐 ?⑦꽩 (URL/Resource Pattern)" required description="보안 ?꾪꽣媛 ?명꽣?됲듃님由ъ냼님寃쎈줈 洹쒖튃">
            <div className="relative group/ptn">
              <Workflow size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/ptn:opacity-100 transition-opacity" />
              <Input
                id="rolePtn"
                value={formData.rolePtn || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, rolePtn: e.target.value }))}
                className="h-16 pl-16 rounded-2xl border-2 text-md font-mono font-black italic shadow-inner"
                placeholder="/api/v1/resource/**"
              />
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-10">
            <FormField label="濡님꾪궎?띿쿂 ?님 description="보안 洹쒖튃님?곸슜님湲곗닠님?덉씠님>
              <select
                id="roleTyp"
                value={formData.roleTyp || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, roleTyp: e.target.value }))}
                className="w-full h-16 px-8 rounded-2xl border-2 border-slate-100 bg-slate-50/50 text-[11px] font-black tracking-widest uppercase focus:ring-8 focus:ring-primary/5 outline-none transition-all shadow-inner cursor-pointer"
              >
                <option value="url">URL_RESOURCE</option>
                <option value="method">METHOD_INVOCATION</option>
                <option value="api">REST_ENDPOINT</option>
              </select>
            </FormField>
            <FormField label="?곗꽑?쒖쐞 (Sort Order)" description="보안 ?꾪꽣 泥댁씤?먯꽌님?곸슜 ?곗꽑?쒖쐞">
              <div className="relative group/sort">
                <ListOrdered size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/sort:opacity-100 transition-opacity" />
                <Input
                  id="roleSort"
                  type="number"
                  value={formData.roleSort || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleSort: e.target.value }))}
                  className="h-16 pl-16 rounded-2xl border-2 text-md font-black italic shadow-inner"
                  placeholder="1"
                />
              </div>
            </FormField>
          </div>

          <FormField label="濡님뺤콉 ?곸꽭 紐낆꽭" description="?대떦 보안 濡ㅼ쓽 援ъ껜?곸씤 ?뺤콉 踰붿쐞 諛?鍮꾩쫰?덉뒪 ?붽굔">
            <div className="relative group/dc">
              <Binary size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity" />
              <Textarea
                id="roleDc"
                value={formData.roleDc || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, roleDc: e.target.value }))}
                className="min-h-[140px] pl-16 p-8 rounded-[2.5rem] border-2 bg-slate-50/50 text-xs font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
                placeholder="?곸꽭 紐낆꽭 ?낅젰..."
              />
            </div>
          </FormField>

          <div className="flex gap-6 pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">痍⑥냼</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
              {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="group-hover:animate-pulse" />}
              <span className="ml-2">濡님꾪궎?띿쿂 諛고룷</span>
            </Button>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}

