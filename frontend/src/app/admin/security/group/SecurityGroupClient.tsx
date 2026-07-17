'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2,
 Plus,
 Loader2,
 Users,
 LayoutGrid,
 Search,
 RefreshCcw,
 Zap,
 Database,
 Lock,
 Activity,
 Fingerprint,
 Binary,
 Network,
 Calendar,
 Settings } from "lucide-react";
import { groupAdminService } from '@/services/foundation/system/GroupAdminService';
import { GroupManage } from '@/types/foundation/security';
import { SearchParams } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
;
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PagePagination } from "@/components/common/PagePagination";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField } from '@/app/components/ui/standard-form';
import { useToast } from '@/app/components/ui/toast';
;

export default function SecurityGroupClient() {
 const queryClient = useQueryClient();
 const { toast } = useToast();
 const [params, setParams] = useState<SearchParams>({
 pageNo: 1,
 searchKeyword: '',
 });
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [editingGroup, setEditingGroup] = useState<GroupManage | null>(null);
 const [formData, setFormData] = useState<GroupManage>({
 groupId: '',
 groupNm: '',
 groupDc: '',
 });

 const { data, isLoading } = useQuery({
 queryKey: ['admin-groups', params],
 queryFn: () => groupAdminService.getGroupList(params),
 });

 const groups: GroupManage[] = data?.list || [];
 const pagination = data ? {
 currentPageNo: data.page,
 recordCountPerPage: data.size,
 totalRecordCount: data.total,
 totalPageCount: data.totalPage
 } : null;

 const createMutation = useMutation({
 mutationFn: (data: GroupManage) => groupAdminService.createGroup(data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
 setIsDialogOpen(false);
 toast('신규 보안 그룹 아키텍처가 설정되었습니다.', 'success');
 },
 onError: () => toast('그룹 생성 중 시스템 예외가 발생했습니다.', 'error')
 });

 const updateMutation = useMutation({
 mutationFn: (data: GroupManage) => groupAdminService.updateGroup(data.groupId, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
 setIsDialogOpen(false);
 toast('보안 그룹 명세가 성공적으로 수정되었습니다.', 'success');
 },
 onError: () => toast('정보 수정 중 시스템 예외가 발생했습니다.', 'error')
 });

 const deleteMutation = useMutation({
 mutationFn: (groupId: string) => groupAdminService.deleteGroup(groupId),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
 toast('보안 그룹 프로필이 영구적으로 파기되었습니다.', 'success');
 },
 onError: () => toast('삭제 처리 중 시스템 예외가 발생했습니다.', 'error')
 });

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 setParams(prev => ({ ...prev, pageNo: 1 }));
 };

 const handleCreate = () => {
 setEditingGroup(null);
 setFormData({ groupId: '', groupNm: '', groupDc: '' });
 setIsDialogOpen(true);
 };

 const handleEdit = (group: GroupManage) => {
 setEditingGroup(group);
 setFormData(group);
 setIsDialogOpen(true);
 };

 const handleDelete = async (groupId: string) => {
 if (!confirm('정말 삭제하시겠습니까?')) return;
 deleteMutation.mutate(groupId);
 };

 const handleSubmit = async () => {
 if (editingGroup) {
 updateMutation.mutate(formData);
 } else {
 createMutation.mutate(formData);
 }
 };

 const columns: Column<GroupManage>[] = [
 {
 header: '도메인 그룹 ID',
 accessor: (item: GroupManage) => (
 <div className="flex items-center gap-4 py-3">
 <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-all duration-500">
 <Fingerprint size={18} className="text-primary" />
 </div>
 <div className="flex flex-col">
 <span className="text-xs font-bold text-muted-foreground/30 tracking-[0.4em] uppercase font-mono leading-none mb-1">GROUP_UID</span>
 <span className="font-mono text-xs font-bold text-foreground tracking-widest uppercase">{item.groupId}</span>
 </div>
 </div>
 ),
 className: 'w-64'
 },
 {
 header: '그룹 아키텍처 명칭',
 accessor: (item: GroupManage) => (
 <div className="flex flex-col gap-0.5">
 <span className="font-bold text-foreground tracking-tight text-md uppercase leading-none mb-1">{item.groupNm}</span>
 <span className="text-xs font-bold text-muted-foreground/40 truncate block max-w-[300px] leading-none">{item.groupDc || '규정 설명이 제공되지 않음'}</span>
 </div>
 )
 },
 {
 header: 'PROVISION_DATE',
 accessor: (item: GroupManage) => (
 <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground font-mono tracking-tighter">
 <Calendar size={12} className="opacity-40" />
 {item.groupCrtDt || 'N/A'}
 </div>
 ),
 className: 'w-48'
 },
 {
 header: 'MANAGEMENT',
 className: 'text-right w-32',
 accessor: (item: GroupManage) => (
 <div className="flex justify-end gap-2 pr-4">
 <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-10 w-10 bg-muted hover:bg-slate-900 hover:text-white rounded-lg border border-border transition-all font-bold shadow-sm group">
 <Settings size={16} className="group-hover:rotate-45 transition-transform" />
 </Button>
 <Button variant="ghost" size="icon" disabled={deleteMutation.isPending} onClick={() => handleDelete(item.groupId)} className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-lg transition-all shadow-sm">
 <Trash2 size={16} />
 </Button>
 </div>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="보안 그룹 아키텍처 거버넌스"
 breadcrumbs={[{ label: '보안 관리' }, { label: '그룹 관리' }]}
 />

 <HubHeader
 title="Security"
 highlight="Group"
 subtitle="시스템 접근 수준을 정의하는 격리 보안 그룹 엔터티 및 정책 아카이브 통합 제어"
 icon={Users}
 actions={
 <div className="flex gap-4 p-2 items-center">
 <Button
 variant="ghost"
 onClick={() => queryClient.invalidateQueries()}
 className="h-11 w-14 rounded-lg bg-white border-2 border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95 px-4"
 >
 <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
 </Button>
 <Button
 onClick={handleCreate}
 className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
 >
 <Plus size={20} className="group-hover:scale-110 transition-transform duration-500" /> 신규 보안 그룹 설정
 </Button>
 </div>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="ACTIVE_GROUPS" value={groups.length} icon={Database} color="indigo" />
 <HubMetricCard title="ENTITY_NODES" value={pagination?.totalRecordCount || 0} icon={LayoutGrid} color="primary" />
 <HubMetricCard title="SYNC_STATUS" value="STEADY" icon={Activity} color="emerald" status="동기화됨" />
 <HubMetricCard title="SECURITY_TIER" value="TIER_1" icon={Lock} color="amber" />
 </HubMetricGrid>

 <HubSectionCard
 title="보안 도메인 그룹 매트릭스"
 description="시스템의 격리 보안 계층을 구성하는 그룹 인벤토리 및 실시간 프로비저닝 상태입니다."
 icon={Network}
 >
 <div className="space-y-8">
 <div className="flex items-center justify-between px-2 pt-2 border-b border-border pb-10 mb-8">
 <div className="flex items-center gap-8">
 <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
 <Input
 placeholder="그룹ID 또는 그룹명으로 검색"
 className="w-[450px] h-11 pl-16 rounded-lg border-2 bg-muted/50 text-sm font-bold tracking-tight shadow-inner"
 value={params.searchKeyword || ''}
 onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
 />
 <Button type="submit" className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1">ANALYZE_RESOURCES</Button>
 </form>
 </div>
 <div>
 <span className="text-xs font-bold text-muted-foreground/30 tracking-[0.4em] uppercase font-mono ">기능 그룹 테이블 프로브</span>
 </div>
 </div>

 <div className="min-h-[500px]">
 <StandardDataTable
 columns={columns}
 data={groups}
 loading={isLoading}
 emptyMessage="식별된 보안 그룹 리소스가 존재하지 않습니다."
 className="border-none bg-transparent"
 />
 </div>

 {pagination && (
 <div className="mt-12 flex justify-center">
 <PagePagination
 pagination={pagination}
 onPageChange={(page) => setParams(prev => ({ ...prev, pageNo: page }))}
 />
 </div>
 )}
 </div>
 </HubSectionCard>

 {/* Group Configuration Modal */}
 <StandardModal
 isOpen={isDialogOpen}
 onClose={() => setIsDialogOpen(false)}
 title={editingGroup ? '보안 그룹 아키텍처 수정' : '신규 보안 도메인 그룹 설정'}
 maxWidth="xl"
 >
 <div className="p-4 space-y-12">
 <div className="grid grid-cols-2 gap-10">
 <FormField label="도메인 그룹 식별자(Group ID)" required description="보안 레이어 내의 유일한 논리 식별자">
 <div className="relative group/id">
 <Fingerprint size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity" />
 <Input
 id="groupId"
 value={formData.groupId || ''}
 onChange={(e) => setFormData(prev => ({ ...prev, groupId: e.target.value }))}
 disabled={!!editingGroup}
 className="h-11 pl-16 rounded-lg border-2 text-md font-bold tracking-widest uppercase shadow-inner"
 placeholder="그룹 식별자"
 />
 </div>
 </FormField>
 <FormField label="그룹 레이블 명칭" required description="UI 상에 노출될 그룹 리터럴 이름">
 <div className="relative group/nm">
 <Users size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/nm:opacity-100 transition-opacity" />
 <Input
 id="groupNm"
 value={formData.groupNm || ''}
 onChange={(e) => setFormData(prev => ({ ...prev, groupNm: e.target.value }))}
 className="h-11 pl-16 rounded-lg border-2 text-md font-bold tracking-tight shadow-inner"
 placeholder="그룹 명칭 입력"
 />
 </div>
 </FormField>
 </div>

 <FormField label="그룹 정책 상세 명세" description="해당 보안 그룹의 비즈니스 목적 및 데이터 접근 범위 명세">
 <div className="relative group/dc">
 <Binary size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity" />
 <Textarea
 id="groupDc"
 value={formData.groupDc || ''}
 onChange={(e) => setFormData(prev => ({ ...prev, groupDc: e.target.value }))}
 className="min-h-[160px] pl-16 p-8 rounded-lg border-2 bg-muted/50 text-xs font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
 placeholder="상세 명세 입력..."
 />
 </div>
 </FormField>

 <div className="flex gap-6 pt-4">
  <button
    type="button"
    onClick={() => setIsDialogOpen(false)}
    className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border border-border text-muted-foreground bg-white hover:bg-slate-900 hover:text-white transition-all outline-none cursor-pointer flex items-center justify-center"
  >
    취소
  </button>
 <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-[2] h-11 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
 {(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="group-hover:animate-pulse" />}
 <span className="ml-2">{editingGroup ? '그룹 수정' : '신규 그룹 배포'}</span>
 </Button>
 </div>
 </div>
 </StandardModal>
 </div>
 );
}
