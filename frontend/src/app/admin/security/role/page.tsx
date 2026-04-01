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
    pageÎ≤àÌò∏: 1,
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
      toast('?†Í∑ú ?∏Î∂Ñ??Î≥¥Ïïà Î°?Role)???±Í≥µ?ÅÏúºÎ°??§Ïû•?òÏóà?µÎãà??', 'success');
    },
    onError: () => toast('Î°??ùÏÑ± Ï§??úÏä§???àÏô∏Í∞Ä Î∞úÏÉù?àÏäµ?àÎã§.', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: (roleCode: string) => roleAdminService.deleteRole(roleCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast('Î≥¥Ïïà Î°??ÑÎ°ú?ÑÏù¥ ?ÅÍµ¨?ÅÏúºÎ°??åÍ∏∞?òÏóà?µÎãà??', 'success');
    },
    onError: () => toast('??†ú Ï≤òÎ¶¨ Ï§??úÏä§???àÏô∏Í∞Ä Î∞úÏÉù?àÏäµ?àÎã§.', 'error')
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(prev => ({ ...prev, pageÎ≤àÌò∏: 1 }));
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
    if (!confirm('?¥Îãπ Î≥¥Ïïà Î°§ÏùÑ ??†ú?òÏãúÍ≤†Ïäµ?àÍπå? ?úÏä§???ëÍ∑º ?úÏñ¥??Ï¶âÍ∞Å ?ÅÌñ•??ÎØ∏Ïπ©?àÎã§.')) return;
    deleteMutation.mutate(roleCode);
  };

  const handleSubmit = async () => {
    createMutation.mutate(formData);
  };

  const columns: Column<RoleManage>[] = [
    {
      header: 'Î≥¥Ïïà Î°??ÑÎ°ú?†ÏΩú',
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
      header: 'Î°?Î™ÖÏÑ∏ (Architecture)',
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
        title="?∏Î∂Ñ??Î≥¥Ïïà Î°?Role) ?ÑÌÇ§?çÏ≤ò"
        breadcrumbs={[{ label: 'Î≥¥ÏïàÍ¥ÄÎ¶? }, { label: 'Î°§Í?Î¶? }]}
      />

      <HubHeader
        title="Access"
        highlight="Control"
        subtitle="Î¶¨ÏÜå???òÏ????ïÎ????ëÍ∑º ?úÏñ¥Î•??ÑÌïú Î≥¥Ïïà Î°??®ÌÑ¥ Î∞??ÄÍ≤??îÎìú?¨Ïù∏??Í±∞Î≤Ñ?åÏä§"
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
              <Plus size={20} className="group-hover:scale-110 transition-transform duration-500" /> ?†Í∑ú Î≥¥Ïïà Î°??§Ïû•
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="Î°??ïÏùò" value={roles.length} icon={Database} color="indigo" />
        <HubMetricCard title="?®ÌÑ¥ ?∏Îìú" value={pagination?.totalRecordCount || 0} icon={Layers} color="primary" />
        <HubMetricCard title="?ÑÎ°úÎ∏??ÅÌÉú" value="?ïÏÉÅ" icon={Activity} color="emerald" status="?ôÍ∏∞?îÎê®" />
        <HubMetricCard title="Í∂åÌïú ?êÎ¶Ñ" value="?ïÏù∏?? icon={Workflow} color="amber" />
      </HubMetricGrid>

      <HubSectionCard
        title="Î≥¥Ïïà Î°??®ÌÑ¥ Îß§Ìä∏Î¶?ä§"
        description="?úÏä§???îÎìú?¨Ïù∏??Î∞?URL ?®ÌÑ¥ Í∏∞Î∞ò???ïÎ? Î≥¥Ïïà ?úÏñ¥ Î™ÖÏÑ∏ Î∞??∏Î≤§?†Î¶¨?ÖÎãà??"
        icon={SearchCode}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-10 mb-8">
            <div className="flex items-center gap-8">
              <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
                <Input
                  placeholder="Î°?ÏΩîÎìú ?êÎäî Í∑úÏπô Î™ÖÏπ≠?ºÎ°ú Î∂ÑÏÑù..."
                  className="w-[450px] h-16 pl-16 rounded-2xl border-2 bg-slate-50/50 text-sm font-black tracking-tight shadow-inner"
                  value={params.searchKeyword || ''}
                  onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                />
                <Button type="submit" className="h-16 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-1">?®ÌÑ¥ Î∂ÑÏÑù</Button>
              </form>
            </div>
            <div>
              <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.4em] uppercase font-mono italic">Í∏∞Îä•????ï† ?åÏù¥Î∏??ÑÎ°úÎ∏?/span>
            </div>
          </div>

          <div className="min-h-[500px]">
            <StandardDataTable
              columns={columns}
              data={roles}
              loading={isLoading}
              emptyMessage="?ùÎ≥Ñ??Î≥¥Ïïà Î°??®ÌÑ¥ Î¶¨ÏÜå?§Í? Ï°¥Ïû¨?òÏ? ?äÏäµ?àÎã§."
              className="border-none bg-transparent"
            />
          </div>

          {pagination && (
            <div className="mt-12 flex justify-center">
              <PagePagination
                pagination={pagination}
                onPageChange={(page) => setParams(prev => ({ ...prev, pageÎ≤àÌò∏: page }))}
              />
            </div>
          )}
        </div>
      </HubSectionCard>

      {/* Role Provisioning Modal */}
      <StandardModal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="?†Í∑ú ?∏Î∂Ñ??Î≥¥Ïïà Î°??§Ïû•"
        maxWidth="xl"
      >
        <div className="p-4 space-y-12">
          <div className="grid grid-cols-2 gap-10">
            <FormField label="Î≥¥Ïïà Î°??ùÎ≥Ñ??(Role Code)" required description="Î≥¥Ïïà ?àÏù¥???¥Ïóê???†Ïùº??Í∑úÏπô ?ùÎ≥Ñ??>
              <div className="relative group/id">
                <Key size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity" />
                <Input
                  id="roleCode"
                  value={formData.roleCode || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleCode: e.target.value }))}
                  className="h-16 pl-16 rounded-2xl border-2 text-md font-black italic tracking-widest uppercase shadow-inner"
                  placeholder="Î°??ùÎ≥Ñ??
                />
              </div>
            </FormField>
            <FormField label="Î°??àÏù¥Î∏?Î™ÖÏπ≠" required description="Î≥¥Ïïà ?ÑÏπ¥?¥Î∏å?êÏÑú ?ùÎ≥Ñ??Í∑úÏπô Î™ÖÏπ≠">
              <div className="relative group/nm">
                <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/nm:opacity-100 transition-opacity" />
                <Input
                  id="roleNm"
                  value={formData.roleNm || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleNm: e.target.value }))}
                  className="h-16 pl-16 rounded-2xl border-2 text-md font-black tracking-tight shadow-inner"
                  placeholder="Î°?Î™ÖÏπ≠ ?ÖÎ†•"
                />
              </div>
            </FormField>
          </div>

          <FormField label="?ëÍ∑º ?®ÌÑ¥ (URL/Resource Pattern)" required description="Î≥¥Ïïà ?ÑÌÑ∞Í∞Ä ?∏ÌÑ∞?âÌä∏??Î¶¨ÏÜå??Í≤ΩÎ°ú Í∑úÏπô">
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
            <FormField label="Î°??ÑÌÇ§?çÏ≤ò ?Ä?? description="Î≥¥Ïïà Í∑úÏπô???ÅÏö©??Í∏∞Ïà†???àÏù¥??>
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
            <FormField label="?∞ÏÑ†?úÏúÑ (Sort Order)" description="Î≥¥Ïïà ?ÑÌÑ∞ Ï≤¥Ïù∏?êÏÑú???ÅÏö© ?∞ÏÑ†?úÏúÑ">
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

          <FormField label="Î°??ïÏ±Ö ?ÅÏÑ∏ Î™ÖÏÑ∏" description="?¥Îãπ Î≥¥Ïïà Î°§Ïùò Íµ¨Ï≤¥?ÅÏù∏ ?ïÏ±Ö Î≤îÏúÑ Î∞?ÎπÑÏ¶à?àÏä§ ?îÍ±¥">
            <div className="relative group/dc">
              <Binary size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity" />
              <Textarea
                id="roleDc"
                value={formData.roleDc || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, roleDc: e.target.value }))}
                className="min-h-[140px] pl-16 p-8 rounded-[2.5rem] border-2 bg-slate-50/50 text-xs font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
                placeholder="?ÅÏÑ∏ Î™ÖÏÑ∏ ?ÖÎ†•..."
              />
            </div>
          </FormField>

          <div className="flex gap-6 pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">Ï∑®ÏÜå</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
              {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="group-hover:animate-pulse" />}
              <span className="ml-2">Î°??ÑÌÇ§?çÏ≤ò Î∞∞Ìè¨</span>
            </Button>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
