'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { ChevronRight, Save, CheckCircle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deptAdminService, Department } from '@/services/foundation/system/DeptAdminService';
import { deptAuthorityAdminService } from '@/services/foundation/system/DeptAuthorityAdminService';
import { AuthorInfo, authorAdminService } from '@/services/foundation/system/AuthorAdminService';

const DEPTS_KEY = ['admin', 'departments'] as const;
const ROLES_KEY = ['admin', 'authorities'] as const;

/**
 * 부서 선택기는 전량이 있어야 한다(클라이언트 필터로 좁히는 UI). 서버 기본값(size=10)이면
 * 11번째 부서부터는 선택 자체가 불가능하다 — 충분히 큰 size 로 한 번에 받는다.
 */
const DEPT_LIST_SIZE = 1000;
/** 권한 그룹 목록은 서버(BaseSearchDto) 기본 페이지 크기와 동일하게 페이징한다. */
const ROLE_PAGE_SIZE = 10;

export default function SecurityDeptAuthorityClient() {
 const { toast } = useToast();
 const confirm = useConfirm();
 const [selectedDept, setSelectedDept] = useState<string | null>(null);
 const [searchKeyword, setSearchKeyword] = useState('');
 const [selectedAuthorCode, setSelectedAuthorCode] = useState<string | null>(null);
 const [rolePage, setRolePage] = useState(1);
 const saveRequestRef = useRef(false);

 const { data: deptsData, isLoading: deptsLoading, error: deptsError, refetch: refetchDepts } = useQuery({
 queryKey: [...DEPTS_KEY, DEPT_LIST_SIZE],
 // 서버는 keyword + Spring Pageable(page/size, 0-based)을 읽는다.
 queryFn: () => deptAdminService.getDeptList({ page: 0, size: DEPT_LIST_SIZE }),
 staleTime: 5 * 60 * 1000,
 });

 const { data: rolesData, isLoading: rolesLoading, error: rolesError, refetch: refetchRoles } = useQuery({
 queryKey: [...ROLES_KEY, rolePage],
 // 서버는 @ModelAttribute BaseSearchDto(pageIndex 1-based / pageUnit)로 받는다.
 // pageIndex 직접 계산은 금지 — AuthorAdminService/ApiService 의 page(0-based) 자동 매핑에 위임한다.
 queryFn: () => authorAdminService.getAuthorList({ page: rolePage - 1, pageUnit: ROLE_PAGE_SIZE }),
 staleTime: 5 * 60 * 1000,
 });

 const depts: Department[] = deptsData?.list || [];
 const roles: AuthorInfo[] = rolesData?.list || [];
 const rolesTotalPage = rolesData?.totalPage || 1;

 const filteredDepts = depts.filter(d =>
 String(d.ognzNm || '').toLocaleLowerCase().includes(searchKeyword.toLocaleLowerCase()) ||
 String(d.ognzId || '').toLocaleLowerCase().includes(searchKeyword.toLocaleLowerCase())
 );

 const loading = rolesLoading;

 const saveMutation = useMutation({
 mutationFn: (authrtId: string) =>
 deptAuthorityAdminService.updateDeptAuthorities({
 deptId: selectedDept!,
 authrtId,
 allMembers: true
 }),
 onSuccess: () => {
 toast('부서 전체 사용자에게 보안 정책이 일괄 적용되었습니다.', 'success');
 setSelectedAuthorCode(null);
 },
 onError: () => toast('권한 저장 중 오류가 발생했습니다.', 'error')
 });

 const columns: Column<AuthorInfo>[] = [
    {
      header: '권한 코드',
      accessor: (item: AuthorInfo) => (
        <span className="font-mono text-[length:var(--font-size-body)] text-foreground">{item.authrtCd}</span>
      ),
      className: 'w-48'
    },
    {
      header: '권한 그룹',
      accessor: (item: AuthorInfo) => (
        <div className="flex flex-col">
          <span className="text-[length:var(--font-size-body)] font-medium text-foreground">{item.authrtNm}</span>
          <span className="truncate text-xs text-muted-foreground">{item.authrtExpln || '설명 없음'}</span>
        </div>
      )
    },
    {
      header: '선택',
      className: 'text-center w-32',
      accessor: (item: AuthorInfo) => {
        const isSelected = selectedAuthorCode === item.authrtCd;
        return (
          <div className="flex justify-center">
            <button
              type="button"
              aria-label={`${item.authrtNm || item.authrtCd} 권한 선택`}
              aria-pressed={isSelected}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAuthorCode(item.authrtCd);
              }}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded border transition-colors',
                isSelected ? 'border-primary bg-primary text-white' : 'border-border bg-card hover:border-primary/40'
              )}
            >
              <CheckCircle size={16} aria-hidden="true" className={isSelected ? 'opacity-100' : 'opacity-0'} />
            </button>
          </div>
        );
      }
    }
  ];

 /**
  * 부서 전 구성원의 기존 개별 권한을 파기하는 파괴적 액션이다.
  * native confirm 대신 useConfirm 을 쓰고, 본문에 대상 부서명·권한명을 그대로 노출한다.
  */
 const handleSave = async () => {
 if (saveRequestRef.current || saveMutation.isPending) return;
 if (!selectedDept) {
 toast('설정할 부서를 먼저 선택해 주세요.', 'info');
 return;
 }
 if (!selectedAuthorCode) {
 toast('부여할 권한을 선택해 주세요.', 'info');
 return;
 }

 const deptName = depts.find(d => d.ognzId === selectedDept)?.ognzNm || selectedDept;
 const roleName = roles.find(r => r.authrtCd === selectedAuthorCode)?.authrtNm || selectedAuthorCode;

 saveRequestRef.current = true;
 try {
 const ok = await confirm({
 title: '조직 권한 일괄 배포',
 message: `'${deptName}' 부서의 모든 구성원에게 '${roleName}'(${selectedAuthorCode}) 권한을 강제 적용합니다. 구성원이 보유한 기존 개별 권한은 파기됩니다. 계속하시겠습니까?`,
 confirmText: '배포',
 variant: 'destructive',
 });
 if (!ok) return;

 try {
 await saveMutation.mutateAsync(selectedAuthorCode);
 } catch {
 // useMutation.onError가 사용자 피드백을 소유한다. action boundary 밖으로 예외를 흘리지 않는다.
 }
 } finally {
 saveRequestRef.current = false;
 }
 };

 const currentDept = depts.find(d => d.ognzId === selectedDept);

  const deptTotal = deptsData?.total ?? depts.length;

  return (
    <MasterDetailPage
      title="부서 권한 일괄 관리"
      description="부서를 선택한 뒤, 그 부서 구성원 전체에 적용할 권한 그룹을 지정합니다."
      breadcrumbItems={[{ label: '보안 관리' }, { label: '조직 권한' }, { label: '일괄 관리' }]}
      actions={
        <Button
          variant="outline"
          size="sm"
          aria-label="부서·권한 목록 새로고침"
          onClick={() => { void refetchDepts(); void refetchRoles(); }}
        >
          <RefreshCcw size={16} aria-hidden="true" /> 새로고침
        </Button>
      }
      masterTitle="부서"
      masterDescription={deptsError ? undefined : `전체 ${deptTotal}개 · 조회 ${filteredDepts.length}개`}
      masterTools={
        <div className="w-48">
          <label htmlFor="dept-search" className="sr-only">부서명 검색</label>
          <Input
            id="dept-search"
            placeholder="부서명·부서 ID"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
      }
      master={
        /* 표가 아니라 선택 목록이라 StandardDataTable 의 error/onRetry 를 쓸 수 없다.
           실패를 '부서 없음'으로 위장하지 않도록 오류·로딩·빈 상태를 각각 구분한다. */
        deptsError ? (
          <div role="alert" className="space-y-2 p-4 text-center">
            <p className="text-sm font-semibold text-foreground">부서 목록을 불러오지 못했습니다.</p>
            <p className="text-[length:var(--font-size-body)] text-muted-foreground">
              네트워크 상태를 확인한 뒤 다시 시도해 주세요.
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetchDepts()}>다시 시도</Button>
          </div>
        ) : deptsLoading ? (
          <p role="status" className="p-4 text-center text-[length:var(--font-size-body)] text-muted-foreground">
            부서 목록을 불러오는 중…
          </p>
        ) : filteredDepts.length === 0 ? (
          <p role="status" className="p-4 text-center text-[length:var(--font-size-body)] text-muted-foreground">
            {searchKeyword ? `"${searchKeyword}"에 대한 검색 결과가 없습니다.` : '등록된 부서가 없습니다.'}
          </p>
        ) : (
          <ul className="space-y-1">
            {filteredDepts.map((d) => (
              <li key={d.ognzId}>
                <button
                  type="button"
                  data-a2-master-item
                  aria-current={selectedDept === d.ognzId ? 'true' : undefined}
                  onClick={() => { setSelectedDept(d.ognzId); setSelectedAuthorCode(null); }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left transition-colors',
                    selectedDept === d.ognzId
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[length:var(--font-size-body)] font-medium text-foreground">
                      {d.ognzNm}
                    </span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">{d.ognzId}</span>
                  </span>
                  <ChevronRight size={14} aria-hidden="true" className="shrink-0 opacity-60" />
                </button>
              </li>
            ))}
          </ul>
        )
      }
      selectedItemLabel={currentDept ? `${currentDept.ognzNm} (${currentDept.ognzId})` : undefined}
      detailTitle="권한 그룹 선택"
      detailDescription={selectedDept ? '선택한 권한 그룹이 이 부서 구성원 전체에 적용됩니다.' : undefined}
      detailActions={
        <Button
          size="sm"
          aria-busy={saveMutation.isPending || undefined}
          onClick={() => void handleSave()}
          disabled={!selectedAuthorCode || saveMutation.isPending}
        >
          <Save size={16} aria-hidden="true" /> {saveMutation.isPending ? '적용 중…' : '부서 전체에 적용'}
        </Button>
      }
      detail={selectedDept ? (
        <div className="space-y-4">
          {/* 되돌릴 수 없는 일괄 변경이라 실행 전에 결과를 평문으로 밝힌다(G10). */}
          <p role="note" className="rounded border border-border bg-muted p-3 text-[length:var(--font-size-body)] text-foreground">
            적용하면 이 부서 구성원이 가진 <strong className="font-semibold">기존 개별 권한은 모두 삭제</strong>되고
            선택한 권한 그룹으로 교체됩니다.
          </p>

          <StandardDataTable
            columns={columns}
            data={roles}
            loading={loading}
            error={rolesError as Error | null}
            onRetry={() => void refetchRoles()}
            keyField="authrtCd"
            emptyMessage="등록된 권한 그룹이 없습니다."
            onRowClick={(item) => setSelectedAuthorCode(item.authrtCd)}
            rowActionLabel={(item) => `${item.authrtNm || item.authrtCd} 권한 선택`}
            pagination={{
              currentPage: rolePage,
              totalPages: rolesTotalPage,
              onPageChange: (p) => setRolePage(p)
            }}
          />
        </div>
      ) : undefined}
      emptyDetailTitle="부서를 선택하세요"
      emptyDetailDescription="왼쪽 목록에서 부서를 선택하면 적용할 권한 그룹 목록이 나타납니다."
      onSaveShortcut={handleSave}
      saveShortcutDisabled={!selectedAuthorCode || saveMutation.isPending}
    />
  );
}
