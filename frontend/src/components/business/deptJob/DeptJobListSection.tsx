'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderCog, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { DeptJobForm, PRIORITY_LABEL, type DeptJobFormValues } from '@/components/business/deptJob/DeptJobForm';
// sonner 직접 호출은 문자열 정규화 페일세이프가 없어 객체가 들어오면 '[object Object]' 가 노출된다.
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { DeptJobBoxManageDialog } from '@/components/business/deptJob/DeptJobBoxManageDialog';
import { useDeptJobSectionSlot } from '@/components/business/deptJob/dept-job-section-slot';

/**
 * A1 — 부서 업무 목록 섹션(조회·등록·삭제).
 *
 * [왜 core 컴포넌트인가] 부서 업무 테이블(tb_dept_task_info·tb_dept_job_bx)은 **core 소유**인데
 * 이 목록 UI 는 `src/app/admin/work-hub/WorkHubClient.tsx`(demo pack 소유) 안에 있었다. 재사용
 * base 생성기의 frontend projection 은 removePaths 를 전이적으로 cascade 제거하므로,
 * `/smart-toolkit/dept-job` 목록 라우트가 그 파일을 import 한다는 이유만으로 core·collaboration
 * 프로필에서 함께 빠졌다 — 기능(테이블·API)은 있는데 목록 화면이 없는 불일치였다.
 * 일정·보고는 테이블도 demo 소유라 일관되며, 어긋난 것은 부서 업무 하나뿐이었다.
 *
 * 이 디렉터리(`src/components/business/deptJob`)는 어느 pack 의 removePaths 에도 없으므로
 * 이 파일은 모든 프로필에 남는다. 그래서 여기에는 **demo 소유 모듈을 import 하지 않는다** —
 * 보고(`components/business/report`)·일정(`components/business/schedule`)·워크허브 어느 쪽도
 * 참조하지 않으며, 탭 스트립은 import 가 아니라 슬롯(`leadingActions`)으로만 받는다.
 */
export interface DeptJobListSectionProps {
  /**
   * 셸 액션 영역 맨 앞에 끼워 넣을 요소(워크허브의 탭 스트립). 없으면 렌더하지 않는다.
   * 지정하지 않으면 `DeptJobSectionSlotProvider` 의 값을 쓰고, provider 도 없으면 `null` 이다.
   */
  leadingActions?: React.ReactNode;
  breadcrumbItems?: { label: string }[];
  /** 조회조건 접힘 상태 저장 키(A1 G2). 화면마다 달라야 하므로 소비자가 명시한다. */
  filterStateKey?: string;
}

const DEFAULT_BREADCRUMB_ITEMS = [{ label: '나의 업무' }, { label: '업무 관리' }];

export function DeptJobListSection({
  leadingActions,
  breadcrumbItems = DEFAULT_BREADCRUMB_ITEMS,
  filterStateKey = 'dept-job',
}: DeptJobListSectionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const slotActions = useDeptJobSectionSlot();
  // prop 이 우선이고, 없으면 context(=demo 레이아웃이 내려준 탭 스트립)를 쓴다.
  const resolvedLeadingActions = leadingActions ?? slotActions;

  // 조회어. KeywordFilter 는 '조회' 버튼·Enter 로만 제출하는 명시 제출 컴포넌트이므로
  // 이 값은 타이핑이 아니라 onSearch 에서만 갱신된다 — 디바운스가 필요 없고 실제로도 없다.
  // (이 화면에서 디바운스가 실재하는 곳은 DeptJobForm 의 담당자 검색 피커뿐이다.)
  const [searchKeyword, setSearchKeyword] = useState('');
  // 목록 페이지(1-based). 종전에는 페이저가 없어 상위 N건만 보이고 나머지는 도달할 수 없었다.
  const [jobPage, setJobPage] = useState(1);
  // 업무 목록의 소유 스코프. 기본은 '내 업무'(내가 담당자인 업무)이고, 토글로 부서 전체를 볼 수 있다.
  // 서버도 scope 미지정을 'mine' 으로 해석하므로 기본값이 양쪽에서 일치한다.
  const [jobScope, setJobScope] = useState<'mine' | 'dept'>('mine');
  /** 페이지당 건수 기본값(A1 필수 — 사용자가 바꿀 수 있다). URL 에는 싣지 않는다. */
  const [pageUnit, setPageUnit] = useState(10);
  /*
    업무 등록 다이얼로그.

    [왜 모달인가] 카탈로그 A3-1 의 기본 규칙이다 — 부서 업무 폼은 첨부·리치에디터도,
    다단계 마법사도, 공유 대상 URL 도 아니다. 반면 이 화면의 조회 상태(검색어·페이지·
    조회범위·페이지당 건수)는 전부 이 컴포넌트의 useState 라 라우트를 떠나면 전손된다.
    '부서 전체 · 3페이지 · 키워드' 로 좁혀 둔 사용자가 업무 하나를 등록하면 그 조건이
    통째로 사라지던 것이 종전 동작이다.

    [`/create` 페이지는 그대로 둔다] 같은 DeptJobForm 을 쓰는 서로 다른 컨테이너이며
    전용 등록 화면은 독립 URL 이 필요한 진입(북마크·딥링크)을 계속 받는다.
  */
  const [isJobModalOpen, setJobModalOpen] = useState(false);
  const [jobDirty, setJobDirty] = useState(false);
  // 진행 중인 동작의 종류와 대상 행을 함께 들고 행별 aria-busy 를 정확히 찍는다.
  const [jobAction, setJobAction] = useState<{ type: 'save' | 'delete'; id?: number } | null>(null);
  const jobActionPendingRef = React.useRef(false);
  const confirm = useConfirm();
  const { user } = useAuth();
  // [2026-09-06 DEC-OPS-037] 업무함 CRUD 는 서버가 @AdminOrSystem 이다. 표시 판정은 라우트 게이트와 같은 역할 집합
  //   (DEC-OPS-023 ②)을 쓴다 — 표시일 뿐 인가가 아니며, 관리자가 아니면 버튼 자체를 그리지 않는다(죽은 버튼 금지, G10).
  const canManageBoxes = canPermission(user, 'DEPT_BOX_READ');
  const [boxManageOpen, setBoxManageOpen] = useState(false);
  const { toast } = useToast();

  // 모달 닫기. 성공 저장은 이 함수를 직접 부르고(이미 저장했으므로 물어볼 것이 없다),
  // 사용자의 닫기 요청은 아래 가드를 거친다.
  const closeJobModal = React.useCallback(() => {
    setJobModalOpen(false);
    setJobDirty(false);
  }, []);
  // 미저장 입력을 들고 닫으려 하면 확인을 받는다 — 전용 페이지(DeptJobCreateClient)가 라우터
  // 가드로 받는 것과 같은 보호를, 같은 문구로 모달에도 준다.
  const requestCloseJob = useDirtyCloseGuard(jobDirty, closeJobModal);
  const handleJobEditState = React.useCallback((s: { dirty: boolean }) => setJobDirty(s.dirty), []);

  // ⚠ 종전에는 getDeptJobBoxes(업무'함')를 조회했다. 그런데 이 화면의 '업무 등록' 버튼은
  //   부서 업무(DeptJob)를 만든다 — 서로 다른 엔티티라, 등록한 업무가 목록에 영원히 나타나지 않았다.
  //   업무함은 부서 단위 구조물이고 CRUD 가 관리자 전용(@AdminOrSystem)이라 이 목록의 대상이 아니다.
  const {
    data: jobData,
    isLoading: isJobLoading,
    isError: isJobError,
    error: jobError,
    refetch: refetchJobs,
  } = useQuery({
    // jobScope 를 queryKey 에 포함해야 토글 시 재조회된다. 빠뜨리면 캐시된 이전 스코프 결과가
    // 그대로 남아 "토글이 먹지 않는" 것처럼 보인다.
    queryKey: ['work-jobs', searchKeyword, jobPage, jobScope, pageUnit],
    // [2026-08-29] searchCondition 을 함께 보낸다. 서버(DeptJobService)는 조건이
    //   '0'(부서업무명)·'1'(내용)·'2'(담당자ID) 일 때만 술어를 붙이고, 그 밖에는 **아무것도
    //   거르지 않는다**. 종전에는 조건 없이 키워드만 보내 무엇을 입력해도 전체 목록이 그대로
    //   나왔고, 화면은 그것을 검색 결과처럼 보여 줬다.
    queryFn: () => deptJobUserService.getDeptJobList({ searchCondition: '0', searchWrd: searchKeyword, pageIndex: jobPage, pageUnit, scope: jobScope }),
  });
  const jobs = jobData?.list || [];
  const jobTotalPages = jobData?.totalPage ?? 1;

  /**
   * 부서 업무 등록. 저장 후 목록에 그대로 머물러 조회 조건(검색어·페이지·조회범위)을 보존한다.
   * 담당자·업무함·PK 는 서버가 판정하거나 채번하므로 폼 값만 그대로 보낸다.
   */
  const handleSubmitJob = async (values: DeptJobFormValues) => {
    // [상호 잠금] 이 섹션의 write 는 둘(업무 등록·업무 삭제)이며 같은 `['work-jobs']` 를
    //   무효화하므로 서로 막는다 — handleDeleteJob 도 대칭으로 같은 ref 를 본다
    //   (폼 검증 census 의 상호 잠금 계약).
    if (jobActionPendingRef.current) return;
    jobActionPendingRef.current = true;
    setJobAction({ type: 'save' });
    try {
      await deptJobUserService.createDeptJob(values);
      toast('업무가 등록되었습니다.', 'success');
      // 저장에 성공했으므로 가드를 거치지 않고 곧장 닫는다.
      closeJobModal();
      await queryClient.invalidateQueries({ queryKey: ['work-jobs'] });
      /*
        [조회범위 안내] 서버의 'mine' 술어는 `picId = 나 OR (담당자 없음 AND 내가 등록)` 이다
        (DeptJobService#searchDeptJobs). 담당자를 **타인으로 지정**하면 방금 만든 업무가
        이 목록에 나타나지 않는다. 종전에는 등록 후 상세 화면으로 떠났기 때문에 이 사실이
        가려져 있었지만, 목록에 머무는 지금은 사용자에게 '등록이 실패했다'로 읽힌다.
        화면이 사실을 말하고 어디서 볼 수 있는지 알려 준다(G10 죽은 어포던스 금지의 반대 방향 —
        일어난 일을 숨기지 않는다).
      */
      const assignee = values.picId?.trim();
      if (jobScope === 'mine' && assignee && assignee !== user?.esntlId) {
        toast('담당자를 다른 사람으로 지정해 「내 업무」 목록에는 보이지 않습니다. 「부서 전체」로 바꾸면 확인할 수 있습니다.', 'info');
      }
    } catch (error) {
      // 필드 오류는 공용 폼이 귀속·focus 하도록 되돌린다.
      if (extractFieldErrors(error)) throw error;
      toast(error instanceof Error ? error.message : '업무 등록에 실패했습니다.', 'error');
    } finally {
      jobActionPendingRef.current = false;
      setJobAction(null);
    }
  };

  /**
   * 부서 업무 삭제(행 액션).
   *
   * 종전에는 업무 행에 '상세' 버튼 하나뿐이라, 업무 하나를 지우려면 상세로 들어갔다가
   * 삭제 후 목록으로 튕겨 나와야 했다 — 그 왕복에서 조회 상태(검색어·페이지·조회범위·
   * 페이지당 건수)가 통째로 초기화된다.
   *
   * [수정은 여기 두지 않는다] 수정의 정본은 상세 화면의 인라인 편집이고 그 화면은 모든
   * 프로필에서 도달 가능하다(상세 버튼). 행 수정 모달을 더하면 진짜 중복 경로가 된다.
   */
  const handleDeleteJob = async (item: { deptTaskSn: number; deptTaskNm?: string | null }) => {
    if (jobActionPendingRef.current) return;
    jobActionPendingRef.current = true;
    setJobAction({ type: 'delete', id: item.deptTaskSn });
    try {
      const ok = await confirm({
        title: '업무 삭제',
        message: `'${item.deptTaskNm || '제목 없음'}' 업무를 삭제하시겠습니까? 삭제한 업무는 되돌릴 수 없습니다.`,
        variant: 'destructive',
        confirmText: '삭제',
      });
      if (!ok) return;
      await deptJobUserService.deleteDeptJob(item.deptTaskSn);
      toast('업무가 삭제되었습니다.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['work-jobs'] });
    } catch {
      toast('삭제에 실패했습니다. 권한이 없거나 이미 삭제된 업무일 수 있습니다.', 'error');
    } finally {
      jobActionPendingRef.current = false;
      setJobAction(null);
    }
  };

  const jobColumns: Column<any>[] = [
    {
      header: '번호',
      accessor: (_, index) => <span className="font-mono text-xs font-bold text-muted-foreground">{(index! + 1).toString().padStart(2, '0')}</span>,
      className: 'w-20 text-center'
    },
    {
      header: '업무명',
      accessor: (item) => (
        <Link href={`/smart-toolkit/dept-job/${item.deptTaskSn}`} className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.deptTaskNm}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            {item.deptTaskBoxNm || '업무함 미지정'}
          </span>
        </Link>
      )
    },
    {
      header: '담당자',
      accessor: (item) => <span className="text-xs font-bold text-muted-foreground tracking-tight">{item.picNm || '미지정'}</span>,
      className: 'w-32'
    },
    {
      header: '우선순위',
      accessor: (item) => (
        <span className="text-xs font-bold tracking-tight">{PRIORITY_LABEL[item.prrtyRnk ?? ''] ?? '-'}</span>
      ),
      className: 'w-28'
    },
    {
      // 상세는 열람·수정의 정본 경로(공유 가능한 URL)이고, 삭제는 목록을 떠나지 않고 끝낸다.
      header: '관리',
      accessor: (item) => (
        <div className="flex justify-end gap-1 pr-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 font-bold text-[11px]"
            aria-label={`${item.deptTaskNm || '업무'} 상세 보기`}
            disabled={jobAction !== null}
            onClick={() => router.push(`/smart-toolkit/dept-job/${item.deptTaskSn}`)}
          >
            상세
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-testid="job-delete"
            aria-label={`${item.deptTaskNm || '업무'} ${jobAction?.type === 'delete' && jobAction.id === item.deptTaskSn ? '삭제 중' : '삭제'}`}
            aria-busy={jobAction?.type === 'delete' && jobAction.id === item.deptTaskSn || undefined}
            disabled={jobAction !== null}
            /* 상태색은 하드코딩 팔레트(rose)가 아니라 시맨틱 토큰을 쓴다 — design-tokens.md 의
               치환 지침 `red·rose → destructive(강조는 -emphasis)`. */
            className="h-9 px-3 font-bold text-[11px] text-destructive-emphasis hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => handleDeleteJob(item)}
          >
            삭제
          </Button>
        </div>
      ),
      className: 'w-24 text-right'
    }
  ];

  const jobTable = (
    <StandardDataTable
      columns={jobColumns}
      data={jobs}
      loading={isJobLoading}
      // 목록이 '내 업무'로 좁혀진 상태의 빈 화면은 데이터 유실처럼 보이기 쉽다.
      // 왜 비었는지와 다음 행동('부서 전체' 선택)을 문구로 알려 준다.
      emptyMessage={
        jobScope === 'mine'
          ? '내가 담당자인 업무가 없습니다. 부서 전체를 보려면 조회 범위에서 \'부서 전체\'를 선택하십시오.'
          : emptyResultMessage(searchKeyword, '등록된 업무가 없습니다.')
      }
      error={isJobError ? (jobError instanceof Error ? jobError : new Error('업무 목록을 불러오지 못했습니다.')) : null}
      onRetry={() => void refetchJobs()}
      pagination={{
        currentPage: jobPage,
        totalPages: Math.max(1, jobTotalPages),
        onPageChange: setJobPage,
        // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
        pageSize: pageUnit,
        onPageSizeChange: (size) => { setPageUnit(size); setJobPage(1); },
      }}
    />
  );

  return (
    <>
      <WorkListPage
        title="업무 관리"
        description="부서 업무의 담당자·우선순위·업무함을 조회합니다."
        breadcrumbItems={breadcrumbItems}
        filterStateKey={filterStateKey}
        totalCount={isJobError ? undefined : jobData?.total}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {resolvedLeadingActions}
            {canManageBoxes && (
              <Button size="sm" variant="outline" onClick={() => setBoxManageOpen(true)}>
                <FolderCog size={16} aria-hidden="true" /> 업무함 관리
              </Button>
            )}
            <Button
              size="sm"
              disabled={jobAction !== null}
              onClick={() => setJobModalOpen(true)}
            >
              <Plus size={16} aria-hidden="true" /> 업무 등록
            </Button>
          </div>
        }
        filter={
          <KeywordFilter
            /*
              [2026-08-29] 라벨은 실제 검색 축이다. 서버가 붙일 수 있는 축은 업무명·내용·
              담당자ID 셋인데 담당자 축은 이름이 아니라 picId(계정 식별자)다. 이름으로 찾으리라
              기대하면 계속 0건이 나오므로 약속하지 않는다. 지금 보내는 축은 업무명이다.
            */
            label="업무명"
            placeholder="검색어를 입력하십시오..."
            value={searchKeyword}
            onSearch={(keyword) => { setSearchKeyword(keyword); setJobPage(1); }}
          >
            <div className="space-y-1">
              <span id="job-scope-label" className="block text-[length:var(--font-size-body)] font-medium">조회 범위</span>
              <div role="group" aria-labelledby="job-scope-label" className="flex rounded-md border border-border p-0.5">
                {(['mine', 'dept'] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    aria-pressed={jobScope === scope}
                    onClick={() => { setJobScope(scope); setJobPage(1); }}
                    className={cn(
                      'flex h-[var(--control-h-sm)] items-center rounded px-4 text-xs font-bold transition-colors',
                      jobScope === scope ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {scope === 'mine' ? '내 업무' : '부서 전체'}
                  </button>
                ))}
              </div>
            </div>
          </KeywordFilter>
        }
        toolbarActions={
          /* 지표 카드 3장을 한 줄 요약으로 수렴한다. */
          <span className="text-[length:var(--font-size-body)] text-muted-foreground">
            {jobScope === 'mine' ? '내가 담당인 업무' : '부서 전체 업무'}
          </span>
        }
      >
        {/*
          탭 패널은 **탭 스트립이 실재할 때만** 그린다. 워크허브(demo)에서는 슬롯이 내려온
          탭 버튼들이 aria-controls="work-hub-tabpanel" 로 이 영역을 가리키지만, core 프로필에는
          탭 자체가 없으므로 가리키는 탭이 없는 tabpanel 을 남기지 않는다.
        */}
        {resolvedLeadingActions ? (
          <div role="tabpanel" id="work-hub-tabpanel" aria-labelledby="work-hub-tab-job">
            {jobTable}
          </div>
        ) : (
          jobTable
        )}
      </WorkListPage>

      {/* 업무 등록 다이얼로그 — 열릴 때만 마운트해 담당자 피커의 조회 훅이 목록 렌더에 끼지 않게 한다. */}
      {isJobModalOpen && (
        <StandardModal
          isOpen
          onClose={requestCloseJob}
          closeDisabled={jobAction?.type === 'save'}
          title="부서 업무 등록"
          maxWidth="2xl"
        >
          <DeptJobForm
            mode="create"
            onSubmit={handleSubmitJob}
            onCancel={requestCloseJob}
            onEditStateChange={handleJobEditState}
            isPending={jobAction?.type === 'save'}
          />
        </StandardModal>
      )}

      {/* 열릴 때만 마운트한다 — 닫으면 폼·선택 상태가 함께 버려지고, 다이얼로그의 조회 훅이 목록 렌더에 끼지 않는다. */}
      {canManageBoxes && boxManageOpen && (
        <DeptJobBoxManageDialog isOpen onClose={() => setBoxManageOpen(false)} />
      )}
    </>
  );
}
