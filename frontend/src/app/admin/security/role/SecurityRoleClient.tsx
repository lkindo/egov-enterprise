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
 Key,
 Settings } from "lucide-react";
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
 /*
   [2026-08-28] 아래 세 값(rolePatrn·roleTypeCd·roleSort)의 필수 강제를 걷어낸다.

   이 화면은 이미 "접근 통제에는 사용되지 않습니다" 라고 밝히고 있다 — 인가 경로
   (DbUrlAuthorizationManager)는 tb_prgrm_lst.url 과 tb_role_prgrm_map 만 본다. 그런데
   그렇게 적어 놓고도 **관리자에게 그 무의미한 값을 반드시 지어내게** 만들고 있었다.

   수정 경로가 열리면서(#73) 그 강제가 실동작으로 드러난다 — 시드 롤(ROLE_ADMIN·ROLE_USER)은
   R__seed_framework.sql 이 role_id·role_nm·role_expln·role_crt_ymd 만 채우므로 세 컬럼이
   NULL 이다. 명칭 오타 하나를 고치려 해도 세 no-op 값을 채워야 저장된다.

   형식 제약(정수·상한)은 값이 있을 때만 남긴다.
 */
 rolePatrn: RoleManageDtoSchema.shape.rolePatrn.unwrap().trim().optional(),
 roleExpln: RoleManageDtoSchema.shape.roleExpln.unwrap().trim(),
 roleTypeCd: RoleManageDtoSchema.shape.roleTypeCd.unwrap().trim().optional(),
 roleSort: z.string().trim()
  .refine((value) => {
   if (value === '') return true;
   if (!/^\d+$/.test(value)) return false;
   const number = Number(value);
   return Number.isSafeInteger(number) && number <= 2_147_483_647;
  }, '정렬 순서는 0 이상의 정수여야 합니다.')
  .optional(),
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
 /*
  * 서버 BaseSearchDto.toPageable() 은 pageUnit 만 본다. ApiService 가 size 로부터 만들어 주는
  * recordCountPerPage 는 페이지 크기에 영향을 주지 않는다. 그래서 종전에는 '페이지당 50건'을
  * 골라도 10건만 나왔고, 응답의 size(=pageUnit 기본 10)를 화면이 되읽어 **셀렉트가 10으로
  * 되돌아갔다.** 사용자는 자기 선택이 씹히는 것을 본다.
  */
 const params: SearchParams = { page: page - 1, size: pageSize, pageUnit: pageSize, searchKeyword };
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
 /** null 이면 등록, 값이 있으면 그 롤을 수정한다(보안 그룹 화면과 같은 규약). */
 const [editingRole, setEditingRole] = useState<RoleManage | null>(null);
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

  /*
   * [2026-08-28] 수정 경로 배선. 종전에는 등록·삭제만 있어 **롤 명칭 오타 하나도 고칠 수 없었다** —
   * 지우고 다시 만드는 것이 유일한 방법이었다. 반면 수정 경로는 위아래로 다 열려 있었다:
   * RoleApiController @PutMapping("/{roleCode}") → RoleManageService.updateRole →
   * RoleInfo.update(roleNm, rolePatrn, roleExpln, roleTypeCd, roleSort), 그리고 프런트
   * roleAdminService.updateRole 까지. 화면만 그 경로를 부르지 않았다.
   */
  const updateMutation = useMutation({
    mutationFn: (data: RoleManage) => roleAdminService.updateRole(data.roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      setIsDialogOpen(false);
      toast('보안 롤 정보가 수정되었습니다.', 'success');
    },
    onError: (error) => {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast('롤 수정 중 시스템 예외가 발생했습니다.', 'error');
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

  const isSubmitPending = createMutation.isPending || updateMutation.isPending;
  const isDeletePending = deletingRoleId !== null;

  const handleCloseDialog = () => {
    if (submitPendingRef.current || deletePendingRef.current) return;
    setIsDialogOpen(false);
  };

  const handleCreate = () => {
    if (submitPendingRef.current || deletePendingRef.current) return;
    setEditingRole(null);
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

  const handleEdit = (role: RoleManage) => {
    if (submitPendingRef.current || deletePendingRef.current) return;
    setEditingRole(role);
    setFormData(role);
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
    /*
     * 접근 통제에 쓰이지 않는 세 값은 스키마에서 선택으로 풀었지만(위 주석 참조),
     * RoleManage 계약은 문자열을 요구한다. 캐스팅으로 덮지 않고 빈 문자열로 정규화해
     * 실제 계약을 맞춘다 — undefined 를 보내면 서버가 기존 값을 지울지 무시할지가
     * 호출부마다 달라진다.
     */
    const payload: RoleManage = {
      ...validated,
      rolePatrn: validated.rolePatrn ?? '',
      roleTypeCd: validated.roleTypeCd ?? '',
      roleSort: validated.roleSort ?? '',
    };
    submitPendingRef.current = true;
    if (editingRole) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
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
      className: 'text-right w-40',
      accessor: (item: RoleManage) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button
            variant="ghost"
            size="icon"
            disabled={isDeletePending || isSubmitPending}
            onClick={() => handleEdit(item)}
            aria-label={`${item.roleNm || item.roleId} 롤 수정`}
            className="h-10 w-10 bg-muted hover:bg-surface-inverse hover:text-surface-inverse-foreground rounded-lg border border-border transition-all shadow-sm"
          >
            <Settings size={16} aria-hidden="true" />
          </Button>
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
 /*
   [2026-08-28] 종전 설명은 '리소스·URL 패턴 기준의 보안 롤을 조회·설정합니다' 였다.
   관리자가 폼을 열기 전에 읽는 첫 문장이 "이 롤은 URL 패턴으로 동작한다"고 약속했는데,
   URL 보호는 tb_prgrm_lst.url ↔ tb_role_prgrm_map 이 결정한다(DbUrlAuthorizationManager).
   세 필드에 '접근 통제에는 사용되지 않습니다' 라고 적어 두고 제목 밑에서는 반대로 말하면,
   잘못된 안전 확신이 그대로 남는다.
 */
 description="롤을 등록·수정합니다. URL 접근 통제는 시스템 프로그램 관리에서 설정합니다."
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
 title={editingRole ? '보안 롤 수정' : '신규 세분화 보안 롤 설정'}
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
            // roleId 는 PK 이자 PUT 의 경로 변수다. 수정 중에 바꾸면 다른 롤을 덮어쓴다.
            readOnly={!!editingRole}
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
  <FormField htmlFor="rolePatrn" label="적용 대상 표기" error={validation.errors.rolePatrn} description="이 롤이 어떤 자원을 겨냥하는지 적어 두는 메모입니다. 접근 통제에는 사용되지 않아 비워 둘 수 있습니다.">
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
        maxLength={300}
        className="h-11 pl-16 rounded-lg border-2 text-md font-mono font-bold shadow-inner"
        placeholder="예: 게시판 관리 화면"
      />
    </div>
  </FormField>

 <div className="grid grid-cols-2 gap-10">
  <FormField htmlFor="roleTypeCd" label="롤 분류" error={validation.errors.roleTypeCd} description="목록에서 롤을 묶어 보기 위한 분류값입니다. 접근 통제에는 사용되지 않아 비워 둘 수 있습니다.">
    <select
      id="roleTypeCd"
      {...validation.fieldProps('roleTypeCd')}
      value={formData.roleTypeCd || ''}
      onChange={(e) => {
        validation.clearError('roleTypeCd');
        setFormData(prev => ({ ...prev, roleTypeCd: e.target.value }));
      }}
      className="w-full h-11 px-8 rounded-lg border-2 border-border bg-muted/50 text-xs font-bold tracking-widest uppercase focus:ring-8 focus:ring-primary/5 outline-none transition-all shadow-inner cursor-pointer"
    >
      <option value="url">URL 리소스</option>
      <option value="method">메서드 호출</option>
      <option value="api">REST 엔드포인트</option>
    </select>
  </FormField>
 <FormField htmlFor="roleSort" label="정렬 순서" error={validation.errors.roleSort} description="목록에서 보이는 순서입니다. 접근 통제에는 사용되지 않아 비워 둘 수 있습니다.">
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
 {/* 장식 아이콘은 접근 가능한 이름에 섞이면 안 된다 — 버튼 이름이 "Zap롤 수정" 이 됐다(실측). */}
 {isSubmitPending ? <Loader2 size={18} aria-hidden="true" className="animate-spin" /> : <Zap size={18} aria-hidden="true" className="group-hover:animate-pulse" />}
 <span className="ml-2">{editingRole ? '롤 수정' : '롤 아키텍처 배포'}</span>
 </Button>
 </div>
 </div>
 </StandardModal>
 </WorkListPage>
 );
}
