'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Loader2,
 Plus,
 Trash2,
 Lock,
 RefreshCcw,
 Zap,
 Binary,
 Workflow,
 ListOrdered,
 Key } from "lucide-react";
import { roleAdminService } from '@/services/foundation/system/RoleAdminService';
import { RoleManage } from '@/types/foundation/security';
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
import { RoleManageDtoSchema } from '@/types/generated-zod';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { FormErrorSummary } from '@/components/ui/form';
;

/** 이 화면이 소유한 쿼리 키. 새로고침/무효화는 반드시 이 범위로만 좁힌다. */
const ROLES_QUERY_KEY = ['admin-roles'] as const;

export const securityRoleFormSchema = RoleManageDtoSchema.extend({
 roleId: RoleManageDtoSchema.shape.roleId.unwrap().trim()
  .min(1, '롤 ID를 입력해 주세요.'),
 roleNm: RoleManageDtoSchema.shape.roleNm.trim()
  .min(1, '롤 명칭을 입력해 주세요.'),
 rolePatrn: RoleManageDtoSchema.shape.rolePatrn.unwrap().trim()
  .min(1, '적용 대상 표기를 입력해 주세요.'),
 roleExpln: RoleManageDtoSchema.shape.roleExpln.unwrap().trim(),
 roleTypeCd: RoleManageDtoSchema.shape.roleTypeCd.unwrap().trim()
  .min(1, '롤 타입을 선택해 주세요.'),
 roleSort: z.string().trim()
  .min(1, '정렬 순서를 입력해 주세요.')
  .regex(/^\d+$/, '정렬 순서는 0 이상의 정수여야 합니다.')
  .refine((value) => {
   const number = Number(value);
   return Number.isSafeInteger(number) && number <= 2_147_483_647;
  }, '정렬 순서는 0 이상의 정수여야 합니다.'),
});

export default function SecurityRoleClient() {
 const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const submitPendingRef = useRef(false);
  const deletePendingRef = useRef(false);
 const [page, setPage] = useState(1);
 /**
  * 입력 컨트롤에는 원본(searchInput)을, 서버 요청/queryKey 에는 디바운스 값만 쓴다.
  * 종전에는 searchKeyword 가 queryKey 인 params 에 직접 들어가 타이핑 한 글자마다 요청이 나갔다.
  */
 const [searchInput, setSearchInput] = useState('');
 const searchKeyword = useDebouncedValue(searchInput, 300);
 // PagePagination은 1-based, ApiService의 표준 page 입력은 0-based다.
 // pageNo는 변환 대상이 아니어서 서버의 BaseSearchDto에서 무시된다.
 /** 페이지당 건수(A1 필수). URL 에는 싣지 않는다. */
 const [pageSize, setPageSize] = useState(10);
 const params: SearchParams = { page: page - 1, size: pageSize, searchKeyword };
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
 const [formData, setFormData] = useState<RoleManage>({
    roleId: '',
    roleNm: '',
    rolePatrn: '',
    roleExpln: '',
    roleTypeCd: '',
    roleSort: '',
  });
 const validationLabels = {
  roleId: '롤 ID',
  roleNm: '롤 명칭',
  rolePatrn: '적용 대상 표기',
  roleTypeCd: '롤 분류',
  roleSort: '정렬 순서',
  roleExpln: '롤 설명',
 };
 const validation = useManualFormValidation(securityRoleFormSchema, { labels: validationLabels });

  // 조회 실패를 '데이터 없음'으로 위장하지 않는다 — error/onRetry 를 테이블까지 내려보낸다.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...ROLES_QUERY_KEY, page, searchKeyword, pageSize],
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
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      setIsDialogOpen(false);
      toast('신규 세분화 보안 롤(Role)이 성공적으로 설정되었습니다.', 'success');
    },
    onError: (error) => {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast('롤 생성 중 시스템 예외가 발생했습니다.', 'error');
    },
    onSettled: () => { submitPendingRef.current = false; },
  });

  const deleteMutation = useMutation({
    mutationFn: (roleCode: string) => roleAdminService.deleteRole(roleCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      toast('보안 롤 프로필이 영구적으로 파기되었습니다.', 'success');
    },
    onError: () => toast('삭제 처리 중 시스템 예외가 발생했습니다.', 'error'),
    onSettled: () => {
      deletePendingRef.current = false;
      setDeletingRoleId(null);
    },
  });

  const isSubmitPending = createMutation.isPending;
  const isDeletePending = deletingRoleId !== null;

  const handleCloseDialog = () => {
    if (submitPendingRef.current || deletePendingRef.current) return;
    setIsDialogOpen(false);
  };

  const handleCreate = () => {
    if (submitPendingRef.current || deletePendingRef.current) return;
    setFormData({
      roleId: '',
      roleNm: '',
      rolePatrn: '',
      roleExpln: '',
      roleTypeCd: 'url',
      roleSort: '1',
    });
    validation.setFormErrors({}, false);
    setIsDialogOpen(true);
  };

  /** 파괴적 액션은 native confirm 대신 useConfirm — 본문에 대상 롤 명칭을 노출한다. */
  const handleDelete = async (role: RoleManage) => {
    if (deletePendingRef.current || submitPendingRef.current) return;
    deletePendingRef.current = true;
    setDeletingRoleId(role.roleId);
    try {
      const ok = await confirm({
        title: '보안 롤 삭제',
        message: `'${role.roleNm || role.roleId}'(${role.roleId}) 롤을 삭제하시겠습니까?`,
        confirmText: '삭제',
        variant: 'destructive',
      });
      if (!ok) {
        deletePendingRef.current = false;
        setDeletingRoleId(null);
        return;
      }
      deleteMutation.mutate(role.roleId);
    } catch {
      deletePendingRef.current = false;
      setDeletingRoleId(null);
      toast('삭제 확인을 시작하지 못했습니다.', 'error');
    }
  };

  const handleSubmit = () => {
    if (submitPendingRef.current || deletePendingRef.current) return;
    const validated = validation.validate(formData);
    if (!validated) return;
    submitPendingRef.current = true;
    createMutation.mutate(validated);
  };

  const columns: Column<RoleManage>[] = [
    {
      header: '보안 롤 프로파일',
      // 셀 밀도: td 가 이미 --cell-px/--cell-py 토큰을 소비하므로 accessor 내부의 추가 py 를 두지 않는다.
      accessor: (item: RoleManage) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-xl group-hover:rotate-12 transition-all duration-500">
            <Lock size={18} className="text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground/30 tracking-tight leading-none mb-1">롤 ID</span>
            <span className="font-mono text-xs font-bold text-foreground tracking-widest uppercase">{item.roleId}</span>
          </div>
        </div>
      ),
      className: 'w-64'
    },
    {
      header: '롤 명세 (Architecture)',
      accessor: (item: RoleManage) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-foreground tracking-tight text-md uppercase leading-none mb-1">{item.roleNm}</span>
          <div className="flex items-center gap-2">
            <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-0.5 rounded uppercase tracking-widest">{item.roleTypeCd}</span>
            <span className="text-xs font-bold text-muted-foreground/40 truncate block max-w-[200px] leading-none">{item.rolePatrn}</span>
          </div>
        </div>
      )
    },
    {
      header: '정렬 순서',
      accessor: (item: RoleManage) => (
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground font-mono tracking-tighter">
          <ListOrdered size={12} className="opacity-40" />
          {item.roleSort || '0'}
        </div>
      ),
      className: 'w-32'
    },
    {
      header: '관리',
      className: 'text-right w-32',
      accessor: (item: RoleManage) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button
            variant="ghost"
            size="icon"
            disabled={isDeletePending || isSubmitPending}
            aria-busy={deletingRoleId === item.roleId || undefined}
            onClick={() => { void handleDelete(item); }}
            aria-label={`${item.roleNm || item.roleId} 롤 ${deletingRoleId === item.roleId ? '삭제 중' : '삭제'}`}
            className="h-10 w-10 text-destructive-emphasis bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 rounded-lg transition-all shadow-sm"
          >
            {deletingRoleId === item.roleId
              ? <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              : <Trash2 size={16} aria-hidden="true" />}
          </Button>
        </div>
      )
    }
  ];

 return (
 <WorkListPage
 title="보안 롤 관리"
 description="리소스·URL 패턴 기준의 보안 롤을 조회·설정합니다."
 breadcrumbItems={[{ label: '보안 관리' }, { label: '롤 관리' }]}
 filterStateKey="security-role"
 totalCount={error ? undefined : pagination?.totalRecordCount}
 actions={
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => refetch()}
 aria-label="보안 롤 목록 새로고침"
 className="gap-2"
 >
 <RefreshCcw size={16} aria-hidden="true" />
 새로고침
 </Button>
 <Button size="sm" onClick={handleCreate} disabled={isDeletePending || isSubmitPending} className="gap-2">
 <Plus size={16} aria-hidden="true" /> 신규 보안 롤 설정
 </Button>
 </>
 }
 filter={
 <div className="min-w-60 max-w-xl space-y-1">
 <label htmlFor="security-role-search" className="text-[length:var(--font-size-body)] font-medium">
 롤코드 · 롤명
 </label>
 <Input
 id="security-role-search"
 aria-label="롤코드 또는 롤명 검색"
 placeholder="롤코드 또는 롤명으로 검색"
 value={searchInput}
 onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
 />
 </div>
 }
 >
 <StandardDataTable
 accessibleLabel="보안 롤 목록"
 keyField="roleId"
 columns={columns}
 data={roles}
 loading={isLoading}
 error={error as Error | null}
 onRetry={() => refetch()}
 emptyMessage={emptyResultMessage(searchKeyword, '등록된 보안 롤이 없습니다.')}
 pagination={{
 currentPage: page,
 totalPages: pagination?.totalPageCount ?? 1,
 onPageChange: (p) => setPage(p),
 pageSize: pagination?.recordCountPerPage ?? pageSize,
 onPageSizeChange: (size: number) => { setPageSize(size); setPage(1); },
 }}
 />

 {/* Role Provisioning Modal */}
 <StandardModal
 isOpen={isDialogOpen}
 onClose={handleCloseDialog}
 title="신규 세분화 보안 롤 설정"
 maxWidth="xl"
 >
 <div className="p-4 space-y-12">
 <FormErrorSummary
 errors={validation.errors}
 labels={validationLabels}
 onNavigate={(name) => { validation.focusError(name); }}
 />
 <div className="grid grid-cols-2 gap-10">
      <FormField htmlFor="roleId" label="보안 롤 식별값(Role Code)" required error={validation.errors.roleId} description="보안 레이어 내의 유일한 규칙 식별자">
        <div className="relative group/id">
          <Key size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity" />
          <Input
            id="roleId"
            {...validation.fieldProps('roleId')}
            value={formData.roleId || ''}
            onChange={(e) => {
              validation.clearError('roleId');
              setFormData(prev => ({ ...prev, roleId: e.target.value }));
            }}
            required
            maxLength={20}
            className="h-11 pl-16 rounded-lg border-2 text-md font-bold tracking-widest uppercase shadow-inner"
            placeholder="롤 식별값"
          />
        </div>
      </FormField>
 <FormField htmlFor="roleNm" label="롤 레이블 명칭" required error={validation.errors.roleNm} description="보안 아카이브에서 식별될 규칙 명칭">
 <div className="relative group/nm">
 <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/nm:opacity-100 transition-opacity" />
 <Input
 id="roleNm"
 {...validation.fieldProps('roleNm')}
 value={formData.roleNm || ''}
 onChange={(e) => {
  validation.clearError('roleNm');
  setFormData(prev => ({ ...prev, roleNm: e.target.value }));
 }}
 required
 maxLength={100}
 className="h-11 pl-16 rounded-lg border-2 text-md font-bold tracking-tight shadow-inner"
 placeholder="롤 명칭 입력"
 />
 </div>
 </FormField>
 </div>

  {/*
    * [2026-08-28 문구 교정] 이 세 필드(rolePatrn·roleTypeCd·roleSort)는 **어떤 보안 필터도 읽지 않는다.**
    * 인가 경로(DbUrlAuthorizationManager)는 securePaths 와 DB 의 URL↔권한 매핑만 보고, RoleInfo 의
    * 이 컬럼들은 저장·조회 경로에만 등장한다(전수 grep 실측). 종전 문구는 "보안 필터가 인터셉트할",
    * "보안 필터 체인에서의 적용 우선순위"라고 적어 **입력하면 접근이 통제된다고 약속**했다.
    * 값이 실제로 하는 일(기록·분류)만 쓴다.
    */}
  <FormField htmlFor="rolePatrn" label="적용 대상 표기" required error={validation.errors.rolePatrn} description="이 롤이 어떤 자원을 겨냥하는지 적어 두는 메모입니다. 접근 통제에는 사용되지 않습니다.">
    <div className="relative group/ptn">
      <Workflow size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/ptn:opacity-100 transition-opacity" />
      <Input
        id="rolePatrn"
        {...validation.fieldProps('rolePatrn')}
        value={formData.rolePatrn || ''}
        onChange={(e) => {
          validation.clearError('rolePatrn');
          setFormData(prev => ({ ...prev, rolePatrn: e.target.value }));
        }}
        required
        maxLength={300}
        className="h-11 pl-16 rounded-lg border-2 text-md font-mono font-bold shadow-inner"
        placeholder="예: 게시판 관리 화면"
      />
    </div>
  </FormField>

 <div className="grid grid-cols-2 gap-10">
  <FormField htmlFor="roleTypeCd" label="롤 분류" required error={validation.errors.roleTypeCd} description="목록에서 롤을 묶어 보기 위한 분류값입니다. 접근 통제에는 사용되지 않습니다.">
    <select
      id="roleTypeCd"
      {...validation.fieldProps('roleTypeCd')}
      value={formData.roleTypeCd || ''}
      onChange={(e) => {
        validation.clearError('roleTypeCd');
        setFormData(prev => ({ ...prev, roleTypeCd: e.target.value }));
      }}
      required
      className="w-full h-11 px-8 rounded-lg border-2 border-border bg-muted/50 text-xs font-bold tracking-widest uppercase focus:ring-8 focus:ring-primary/5 outline-none transition-all shadow-inner cursor-pointer"
    >
      <option value="url">URL 리소스</option>
      <option value="method">메서드 호출</option>
      <option value="api">REST 엔드포인트</option>
    </select>
  </FormField>
 <FormField htmlFor="roleSort" label="정렬 순서" required error={validation.errors.roleSort} description="목록에서 보이는 순서입니다. 접근 통제에는 사용되지 않습니다.">
 <div className="relative group/sort">
 <ListOrdered size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/sort:opacity-100 transition-opacity" />
 <Input
 id="roleSort"
 {...validation.fieldProps('roleSort')}
 type="number"
 value={formData.roleSort || ''}
 onChange={(e) => {
  validation.clearError('roleSort');
  setFormData(prev => ({ ...prev, roleSort: e.target.value }));
 }}
 required
 min={0}
 max={2_147_483_647}
 step={1}
 inputMode="numeric"
 className="h-11 pl-16 rounded-lg border-2 text-md font-bold shadow-inner"
 placeholder="1"
 />
 </div>
 </FormField>
 </div>

  <FormField htmlFor="roleExpln" label="롤 정책 상세 명세" error={validation.errors.roleExpln} description="해당 보안 롤의 구체적인 정책 범위 및 비즈니스 요건">
    <div className="relative group/dc">
      <Binary size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity" />
      <Textarea
        id="roleExpln"
        {...validation.fieldProps('roleExpln')}
        value={formData.roleExpln || ''}
        onChange={(e) => {
          validation.clearError('roleExpln');
          setFormData(prev => ({ ...prev, roleExpln: e.target.value }));
        }}
        maxLength={4000}
        className="min-h-[140px] pl-16 p-8 rounded-lg border-2 bg-muted/50 text-xs font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
        placeholder="상세 명세 입력..."
      />
    </div>
  </FormField>

 <div className="flex gap-6 pt-4">
  <button
    type="button"
    onClick={handleCloseDialog}
    disabled={isSubmitPending || isDeletePending}
    className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border border-border text-muted-foreground bg-card hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
  >
    취소
  </button>
 <Button onClick={handleSubmit} aria-busy={isSubmitPending || undefined} disabled={isSubmitPending || isDeletePending} className="flex-[2] h-11 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
 {isSubmitPending ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="group-hover:animate-pulse" />}
 <span className="ml-2">롤 아키텍처 배포</span>
 </Button>
 </div>
 </div>
 </StandardModal>
 </WorkListPage>
 );
}
