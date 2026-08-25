'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2,
 Plus,
 Loader2,
 Users,
 RefreshCcw,
 Zap,
 Fingerprint,
 Binary,
 Calendar,
 Settings } from "lucide-react";
import { groupAdminService } from '@/services/foundation/system/GroupAdminService';
import { GroupManage } from '@/types/foundation/security';
import { SearchParams } from '@/types/foundation/system';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
;
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField } from '@/app/components/ui/standard-form';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
;

/** 이 화면이 소유한 쿼리 키. 새로고침/무효화는 반드시 이 범위로만 좁힌다. */
const GROUPS_QUERY_KEY = ['admin-groups'] as const;

export default function SecurityGroupClient() {
 const queryClient = useQueryClient();
 const { toast } = useToast();
 const confirm = useConfirm();
 const [page, setPage] = useState(1);
 /**
  * 입력 컨트롤에는 원본(searchInput)을, 서버 요청/queryKey 에는 디바운스 값만 쓴다.
  * 종전에는 searchKeyword 가 queryKey 인 params 에 직접 들어가 타이핑 한 글자마다 요청이 나갔다.
  */
 const [searchInput, setSearchInput] = useState('');
 const searchKeyword = useDebouncedValue(searchInput, 300);
 // PagePagination은 1-based, ApiService의 표준 page 입력은 0-based다.
 // pageNo는 변환 대상이 아니어서 서버의 pageIndex 요청 파라미터로 전달되지 않는다.
 /** 페이지당 건수(A1 필수). URL 에는 싣지 않는다. */
 const [pageSize, setPageSize] = useState(10);
 const params: SearchParams = { page: page - 1, size: pageSize, searchKeyword };
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [editingGroup, setEditingGroup] = useState<GroupManage | null>(null);
 const [formData, setFormData] = useState<GroupManage>({
 groupId: '',
 groupNm: '',
 groupDc: '',
 });

 // 조회 실패를 '데이터 없음'으로 위장하지 않는다 — error/onRetry 를 테이블까지 내려보낸다.
 const { data, isLoading, error, refetch } = useQuery({
 queryKey: [...GROUPS_QUERY_KEY, page, searchKeyword, pageSize],
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
 queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
 setIsDialogOpen(false);
 toast('신규 보안 그룹 아키텍처가 설정되었습니다.', 'success');
 },
 onError: () => toast('그룹 생성 중 시스템 예외가 발생했습니다.', 'error')
 });

 const updateMutation = useMutation({
 mutationFn: (data: GroupManage) => groupAdminService.updateGroup(data.groupId, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
 setIsDialogOpen(false);
 toast('보안 그룹 명세가 성공적으로 수정되었습니다.', 'success');
 },
 onError: () => toast('정보 수정 중 시스템 예외가 발생했습니다.', 'error')
 });

 const deleteMutation = useMutation({
 mutationFn: (groupId: string) => groupAdminService.deleteGroup(groupId),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
 toast('보안 그룹 프로필이 영구적으로 파기되었습니다.', 'success');
 },
 onError: () => toast('삭제 처리 중 시스템 예외가 발생했습니다.', 'error')
 });

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

 /** 파괴적 액션은 native confirm 대신 useConfirm — 본문에 대상 그룹 명칭을 노출한다. */
 const handleDelete = async (group: GroupManage) => {
 const ok = await confirm({
 title: '보안 그룹 삭제',
 message: `'${group.groupNm || group.groupId}'(${group.groupId}) 그룹을 삭제하시겠습니까? 이 그룹에 연결된 접근 정책이 함께 사라집니다.`,
 confirmText: '삭제',
 variant: 'destructive',
 });
 if (!ok) return;
 deleteMutation.mutate(group.groupId);
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
 // 셀 밀도: td 가 이미 --cell-px/--cell-py 토큰을 소비하므로 accessor 내부의 추가 py 를 두지 않는다.
 accessor: (item: GroupManage) => (
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-xl group-hover:rotate-12 transition-all duration-500">
 <Fingerprint size={18} className="text-primary" />
 </div>
 <div className="flex flex-col">
 <span className="text-xs font-bold text-muted-foreground/30 tracking-tight leading-none mb-1">그룹 ID</span>
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
  header: '등록일',
 accessor: (item: GroupManage) => (
 <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground font-mono tracking-tighter">
 <Calendar size={12} className="opacity-40" />
 {item.groupCrtDt || 'N/A'}
 </div>
 ),
 className: 'w-48'
 },
 {
  header: '관리',
 className: 'text-right w-32',
 accessor: (item: GroupManage) => (
 <div className="flex justify-end gap-2 pr-4">
 <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} aria-label={`${item.groupNm || item.groupId} 그룹 수정`} className="h-10 w-10 bg-muted hover:bg-surface-inverse hover:text-surface-inverse-foreground rounded-lg border border-border transition-all font-bold shadow-sm group">
 <Settings size={16} aria-hidden="true" className="group-hover:rotate-45 transition-transform" />
 </Button>
 <Button variant="ghost" size="icon" disabled={deleteMutation.isPending} onClick={() => handleDelete(item)} aria-label={`${item.groupNm || item.groupId} 그룹 삭제`} className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-lg transition-all shadow-sm">
 <Trash2 size={16} aria-hidden="true" />
 </Button>
 </div>
 )
 }
 ];

 return (
 <WorkListPage
 title="보안 그룹 관리"
 description="시스템 접근 수준을 정의하는 보안 그룹을 조회·설정합니다."
 breadcrumbItems={[{ label: '보안 관리' }, { label: '그룹 관리' }]}
 filterStateKey="security-group"
 totalCount={error ? undefined : pagination?.totalRecordCount}
 actions={
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => refetch()}
 aria-label="보안 그룹 목록 새로고침"
 className="gap-2"
 >
 <RefreshCcw size={16} aria-hidden="true" />
 새로고침
 </Button>
 <Button size="sm" onClick={handleCreate} className="gap-2">
 <Plus size={16} aria-hidden="true" /> 신규 보안 그룹 설정
 </Button>
 </>
 }
 filter={
 <div className="min-w-60 max-w-xl space-y-1">
 <label htmlFor="security-group-search" className="text-[length:var(--font-size-body)] font-medium">
 그룹ID · 그룹명
 </label>
 <Input
 id="security-group-search"
 aria-label="그룹ID 또는 그룹명 검색"
 placeholder="그룹ID 또는 그룹명으로 검색"
 value={searchInput}
 onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
 />
 </div>
 }
 >
 <StandardDataTable
 accessibleLabel="보안 그룹 목록"
 keyField="groupId"
 columns={columns}
 data={groups}
 loading={isLoading}
 error={error as Error | null}
 onRetry={() => refetch()}
 emptyMessage={emptyResultMessage(searchKeyword, '등록된 보안 그룹이 없습니다.')}
 pagination={{
 currentPage: page,
 totalPages: pagination?.totalPageCount ?? 1,
 onPageChange: (p) => setPage(p),
 pageSize: pagination?.recordCountPerPage ?? pageSize,
 onPageSizeChange: (size: number) => { setPageSize(size); setPage(1); },
 }}
 />

 {/* Group Configuration Modal */}
 <StandardModal
 isOpen={isDialogOpen}
 onClose={() => setIsDialogOpen(false)}
 title={editingGroup ? '보안 그룹 아키텍처 수정' : '신규 보안 도메인 그룹 설정'}
 maxWidth="xl"
 >
 <div className="p-4 space-y-12">
 <div className="grid grid-cols-2 gap-10">
 <FormField htmlFor="groupId" label="도메인 그룹 식별자(Group ID)" required description="보안 레이어 내의 유일한 논리 식별자">
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
 <FormField htmlFor="groupNm" label="그룹 레이블 명칭" required description="UI 상에 노출될 그룹 리터럴 이름">
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

 <FormField htmlFor="groupDc" label="그룹 정책 상세 명세" description="해당 보안 그룹의 비즈니스 목적 및 데이터 접근 범위 명세">
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
    className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border border-border text-muted-foreground bg-card hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
  >
    취소
  </button>
 <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-[2] h-11 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
 {(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="group-hover:animate-pulse" />}
 <span className="ml-2">{editingGroup ? '그룹 수정' : '신규 그룹 배포'}</span>
 </Button>
 </div>
 </div>
 </StandardModal>
 </WorkListPage>
 );
}
