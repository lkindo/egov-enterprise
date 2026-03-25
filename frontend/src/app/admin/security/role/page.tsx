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
import { roleAdminService } from '@/services/admin/system/RoleAdminService';
import { RoleManage } from '@/types/security';
import { SearchParams } from '@/types/system';
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
    page번호: 1,
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
      toast('신규 세분화 보안 롤(Role)이 성공적으로 실장되었습니다.', 'success');
    },
    onError: () => toast('롤 생성 중 시스템 예외가 발생했습니다.', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: (roleCode: string) => roleAdminService.deleteRole(roleCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast('보안 롤 프로필이 영구적으로 파기되었습니다.', 'success');
    },
    onError: () => toast('삭제 처리 중 시스템 예외가 발생했습니다.', 'error')
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(prev => ({ ...prev, page번호: 1 }));
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
    if (!confirm('해당 보안 롤을 삭제하시겠습니까? 시스템 접근 제어에 즉각 영향을 미칩니다.')) return;
    deleteMutation.mutate(roleCode);
  };

  const handleSubmit = async () => {
    createMutation.mutate(formData);
  };

  const columns: Column<RoleManage>[] = [
    {
      header: '보안 롤 프로토콜',
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
      header: '롤 명세 (Architecture)',
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
        title="세분화 보안 롤(Role) 아키텍처"
        breadcrumbs={[{ label: '보안관리' }, { label: '롤관리' }]}
      />

      <HubHeader 
        title="Access" 
        highlight="Control" 
        subtitle="리소스 수준의 정밀한 접근 제어를 위한 보안 롤 패턴 및 타겟 엔드포인트 거버넌스" 
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
              className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
            >
              <Plus size={20} className="group-hover:scale-110 transition-transform duration-500" /> 신규 보안 롤 실장
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="ROLE_DEFINITIONS" value={roles.length} icon={Database} color="indigo" />
        <HubMetricCard title="PATTERN_NODES" value={pagination?.totalRecordCount || 0} icon={Layers} color="primary" />
        <HubMetricCard title="PROBE_STATUS" value="STEADY" icon={Activity} color="emerald" status="동기화됨" />
        <HubMetricCard title="GRANT_FLOW" value="VERIFIED" icon={Workflow} color="amber" />
      </HubMetricGrid>

      <HubSectionCard 
        title="보안 롤 패턴 매트릭스" 
        description="시스템 엔드포인트 및 URL 패턴 기반의 정밀 보안 제어 명세 및 인벤토리입니다." 
        icon={SearchCode}
      >
        <div className="space-y-8">
            <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-10 mb-8">
                <div className="flex items-center gap-8">
                    <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
                        <Input
                            placeholder="롤 코드 또는 규칙 명칭으로 분석..."
                            className="w-[450px] h-16 pl-16 rounded-2xl border-2 bg-slate-50/50 text-sm font-black tracking-tight shadow-inner"
                            value={params.searchKeyword || ''}
                            onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                        />
                        <Button type="submit" className="h-16 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1">ANALYZE_PATTERNS</Button>
                    </form>
                </div>
                <div>
                     <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.4em] uppercase font-mono italic">기능적 역할 테이블 프로브</span>
                </div>
            </div>

            <div className="min-h-[500px]">
                <StandardDataTable
                    columns={columns}
                    data={roles}
                    loading={isLoading}
                    emptyMessage="식별된 보안 롤 패턴 리소스가 존재하지 않습니다."
                    className="border-none bg-transparent"
                />
            </div>

            {pagination && (
                <div className="mt-12 flex justify-center">
                    <PagePagination
                        pagination={pagination}
                        onPageChange={(page) => setParams(prev => ({ ...prev, page번호: page }))}
                    />
                </div>
            )}
        </div>
      </HubSectionCard>

      {/* Role Provisioning Modal */}
      <StandardModal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="신규 세분화 보안 롤 실장"
        maxWidth="xl"
      >
        <div className="p-4 space-y-12">
            <div className="grid grid-cols-2 gap-10">
                <FormField label="보안 롤 식별자 (Role Code)" required description="보안 레이어 내에서 유일한 규칙 식별자">
                    <div className="relative group/id">
                        <Key size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity" />
                        <Input
                            id="roleCode"
                            value={formData.roleCode || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, roleCode: e.target.value }))}
                            className="h-16 pl-16 rounded-2xl border-2 text-md font-black italic tracking-widest uppercase shadow-inner"
                            placeholder="ROLE_IDENTIFIER"
                        />
                    </div>
                </FormField>
                <FormField label="롤 레이블 명칭" required description="보안 아카이브에서 식별될 규칙 명칭">
                    <div className="relative group/nm">
                        <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/nm:opacity-100 transition-opacity" />
                        <Input
                            id="roleNm"
                            value={formData.roleNm || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, roleNm: e.target.value }))}
                            className="h-16 pl-16 rounded-2xl border-2 text-md font-black tracking-tight shadow-inner"
                            placeholder="롤 명칭 입력"
                        />
                    </div>
                </FormField>
            </div>
 
            <FormField label="접근 패턴 (URL/Resource Pattern)" required description="보안 필터가 인터셉트할 리소스 경로 규칙">
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
                <FormField label="롤 아키텍처 타입" description="보안 규칙이 적용될 기술적 레이어">
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
                <FormField label="우선순위 (Sort Order)" description="보안 필터 체인에서의 적용 우선순위">
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
 
            <FormField label="롤 정책 상세 명세" description="해당 보안 롤의 구체적인 정책 범위 및 비즈니스 요건">
                <div className="relative group/dc">
                    <Binary size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity" />
                    <Textarea
                        id="roleDc"
                        value={formData.roleDc || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, roleDc: e.target.value }))}
                        className="min-h-[140px] pl-16 p-8 rounded-[2.5rem] border-2 bg-slate-50/50 text-xs font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
                        placeholder="상세 명세 입력..."
                    />
                </div>
            </FormField>

            <div className="flex gap-6 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest uppercase border-2">취소</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending} className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
                    {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="group-hover:animate-pulse" />} 
                    <span className="ml-2">DEPLOY_ROLE_ARCHITECTURE</span>
                </Button>
            </div>
        </div>
      </StandardModal>
    </div>
  );
}
