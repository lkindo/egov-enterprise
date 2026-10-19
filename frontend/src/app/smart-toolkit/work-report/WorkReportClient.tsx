'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reportService, type WorkReport } from '@/services/business/user/ReportService';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { ReportCreateForm, type ReportFormValues } from '@/components/business/report/ReportCreateForm';
import { useWorkHubTabStrip, useWorkReportLinks } from '@/components/business/work-hub/work-hub-tabs';
// sonner 직접 호출은 문자열 정규화 페일세이프가 없어 객체가 들어오면 '[object Object]' 가 노출된다.
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { toDisplayYmd } from '@/lib/format-date';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { failureMessage } from '@/lib/safe-error-log';
import { isConflictError } from '@/lib/query/list-query-defaults';

/**
 * 업무 보고 화면(/smart-toolkit/work-report, 업무 허브 분해 W1).
 *
 * 종전에는 업무 관리·업무 보고·일정 세 라우트가 업무 허브 클라이언트 하나를 탭 상태로 공유했다. 그 허브가 보고·일정 모듈을 함께
 * import 해 두 기능이 서로를 요구했고, 기능 하나만 고른 생성물에 없는 화면이 남았다. 이제 이 화면은 업무 보고 기능 경로에만 있고,
 * 탭 줄은 core 도우미(useWorkHubTabStrip)가, 머리의 '메모보고 관리' 링크와 안내 문장은 메모 보고 기능의 링크 기여가 준다.
 * 목록·검색·페이지·보고 모달·삭제·미저장 가드는 분해 전 업무 허브의 보고 부분을 줄 단위로 옮겼다.
 */
interface WorkReportClientProps {
  /** 서버가 Asia/Seoul 기준으로 계산한 yyyyMMdd. SSR과 첫 클라이언트 렌더가 같은 날짜를 쓴다. */
  initialYmd: string;
}

const ROUTE = '/smart-toolkit/work-report';

export default function WorkReportClient({ initialYmd }: WorkReportClientProps) {
  const queryClient = useQueryClient();
  const tabs = useWorkHubTabStrip(ROUTE);
  const links = useWorkReportLinks();

  // 조회어. KeywordFilter 는 '조회' 버튼·Enter 로만 제출하는 명시 제출 컴포넌트이므로
  // 이 값은 타이핑이 아니라 onSearch 에서만 갱신된다 — 디바운스가 필요 없고 실제로도 없다.
  const [searchKeyword, setSearchKeyword] = useState('');
  // 목록 페이지(1-based). 종전에는 페이저가 없어 상위 N건만 보이고 나머지는 도달할 수 없었다.
  const [reportPage, setReportPage] = useState(1);
  /** 페이지당 건수 기본값(A1 필수 — 사용자가 바꿀 수 있다). URL 에는 싣지 않는다. */
  const [pageUnit, setPageUnit] = useState(10);
  // 업무 보고 등록 다이얼로그. 종전에는 이 탭의 '새 업무 생성' 버튼에 onClick 이 없었다.
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WorkReport | null>(null);
  // 폼의 미저장 여부. 닫기 가드가 이 값만 본다 — 저장 중 차단은 StandardModal 의
  // closeDisabled 가 따로 소유하므로 여기서 pending 을 다시 판정하지 않는다.
  const [reportDirty, setReportDirty] = useState(false);
  // 진행 중인 동작의 종류와 대상 행을 함께 들고 행별 aria-busy 를 정확히 찍는다.
  const reportActionPendingRef = React.useRef(false);
  const [reportAction, setReportAction] = useState<{ type: 'save' | 'delete'; id?: number } | null>(null);
  const confirm = useConfirm();
  const { toast } = useToast();

  // 모달 닫기. 성공 저장은 이 함수를 직접 부르고(이미 저장했으므로 물어볼 것이 없다),
  // 사용자의 닫기 요청은 아래 가드를 거친다.
  const closeReportModal = React.useCallback(() => {
    setReportModalOpen(false);
    setEditingReport(null);
    setReportDirty(false);
  }, []);
  // 미저장 입력을 들고 닫으려 하면 확인을 받는다 — 전용 페이지(DeptJobCreateClient)가 라우터
  // 가드로 받는 것과 같은 보호를, 같은 문구로 모달에도 준다.
  const requestCloseReport = useDirtyCloseGuard(reportDirty, closeReportModal);
  const handleReportEditState = React.useCallback((s: { dirty: boolean }) => setReportDirty(s.dirty), []);

  const {
    data: reportData,
    isLoading: isReportLoading,
    isError: isReportError,
    error: reportError,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['work-reports', searchKeyword, reportPage, pageUnit],
    queryFn: () => reportService.getReports({ pageIndex: reportPage, pageUnit, searchWrd: searchKeyword }),
  });
  const reports = reportData?.list || [];
  const reportTotalPages = reportData?.totalPage ?? 1;
  const reportTotal = reportData?.total ?? 0;

  /** 업무 보고 등록. 작성자(userId)는 서버가 인증 주체로 채우므로 보내지 않는다. */
  const handleSubmitReport = async (values: ReportFormValues) => {
    if (reportActionPendingRef.current) return;
    reportActionPendingRef.current = true;
    setReportAction({ type: 'save', id: editingReport?.rptpSn });
    try {
      if (editingReport?.rptpSn) {
        // [2026-10-18] 창을 열 때 읽은 버전을 함께 보낸다 — 그 사이 다른 사람이 고쳤으면 서버가 409 로 거부해 덮어쓰지 않는다.
        await reportService.updateReport(editingReport.rptpSn, { ...values, version: editingReport.version ?? undefined });
        toast('업무 보고가 수정되었습니다.', 'success');
      } else {
        await reportService.createReport(values);
        toast('업무 보고가 등록되었습니다.', 'success');
      }
      // 저장에 성공했으므로 가드를 거치지 않고 곧장 닫는다(물어볼 미저장 변경이 없다).
      closeReportModal();
      await queryClient.invalidateQueries({ queryKey: ['work-reports'] });
    } catch (error) {
      if (extractFieldErrors(error)) throw error;
      toast(failureMessage(error, '업무 보고 저장 중 오류가 발생했습니다.'), 'error');
      // 다른 사람이 먼저 고쳤다(409) — 목록을 다시 읽어 다음 수정이 최신 버전으로 열리게 한다. 입력한 내용은 창에 남긴다.
      if (isConflictError(error)) void queryClient.invalidateQueries({ queryKey: ['work-reports'] });
    } finally {
      reportActionPendingRef.current = false;
      setReportAction(null);
    }
  };

  /** 보고 삭제. 서버가 작성자 본인 또는 관리자만 허용하므로 실패는 그대로 알린다. */
  const handleDeleteReport = async (item: WorkReport) => {
    if (reportActionPendingRef.current) return;
    reportActionPendingRef.current = true;
    setReportAction({ type: 'delete', id: item.rptpSn });
    try {
      const ok = await confirm({
        title: '업무 보고 삭제',
        message: `'${item.rptTtl || '제목 없음'}' 보고를 삭제하시겠습니까?`,
        variant: 'destructive',
        confirmText: '삭제',
      });
      if (!ok) return;
      await reportService.deleteReport(item.rptpSn);
      toast('업무 보고가 삭제되었습니다.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['work-reports'] });
    } catch (error) {
      toast(failureMessage(error, '업무 보고 삭제 중 오류가 발생했습니다.'), 'error');
    } finally {
      reportActionPendingRef.current = false;
      setReportAction(null);
    }
  };

  const reportColumns: Column<WorkReport>[] = [
    {
      /*
        [2026-09-26 DIP V9] 번호가 페이지 안 순번(01·02…)이라 페이지마다 다시 01 이 됐다. 서버가 최신순으로 주므로
        다른 목록과 같이 전체 건수에서 거꾸로 센다.
      */
      header: '번호',
      accessor: (_, index) => <span className="font-mono text-xs font-bold text-muted-foreground">{reportTotal - (reportPage - 1) * pageUnit - (index ?? 0)}</span>,
      className: 'w-20 text-center'
    },
    {
      header: '보고서 제목',
      accessor: (item) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.rptTtl}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">보고 일자: {toDisplayYmd(item.rptYmd)}</span>
        </div>
      )
    },
    {
      header: '작성자',
      /*
        [2026-08-29] 이름을 보여 준다. 종전에는 userId 원문(로그인 ID)만 찍어, 사람 이름이
        아니라 계정 문자열이라 누가 쓴 보고인지 목록만으로는 알 수 없었다.

        이름을 못 찾으면 **로그인 ID 로 되돌아간다** — 서버가 사전에 없는 작성자(탈퇴 등)에
        대해 userNm 을 비워 보내므로, '알 수 없음' 같은 값을 여기서 지어내지 않는다.
      */
      accessor: (item) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">
          {item.userNm || item.userId}
        </span>
      ),
      className: 'w-32'
    },
    {
      // 종전에는 onClick 이 없는 死버튼이었다. 백엔드는 수정·삭제를 모두 제공하는데 진입점이 없었다.
      header: '관리',
      accessor: (item) => (
        <div className="flex justify-end gap-1 pr-4">
          <Button
            variant="ghost"
            size="sm"
            className="font-bold text-[11px] h-[var(--control-h)]"
            aria-label={`${item.rptTtl || '제목 없음'} 보고 수정`}
            disabled={reportAction !== null}
            onClick={() => { setEditingReport(item); setReportModalOpen(true); }}
          >
            수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="font-bold text-[11px] text-rose-600 hover:text-rose-700 h-[var(--control-h)]"
            aria-label={`${item.rptTtl || '제목 없음'} 보고 ${reportAction?.type === 'delete' && reportAction.id === item.rptpSn ? '삭제 중' : '삭제'}`}
            aria-busy={reportAction?.type === 'delete' && reportAction.id === item.rptpSn || undefined}
            disabled={reportAction !== null}
            onClick={() => handleDeleteReport(item)}
          >
            삭제
          </Button>
        </div>
      ),
      className: 'w-32 text-right'
    }
  ];

  /*
    [2026-09-26 DIP D9] 업무 보고에는 받는 사람이 없다 — 누구에게 올리는 보고가 아니라 개인 업무 기록이다.
    탭 이름은 메뉴 어휘(V2_27)와 맞춰 두고 설명으로 성격을 밝힌다. 받는 사람에게 올리는 것은 메모 보고다.
    [업무 허브 분해 W1] 메모 보고를 안내하는 문장은 메모 보고 기여가 링크와 함께 준다 — 메모 보고 화면에 들어갈 수 없는 사람이나
    메모 보고가 없는 구성에서는 갈 수 없는 화면을 안내하지 않는다.
  */
  const description = [
    '받는 사람 없이 남기는 개인 업무 기록입니다.',
    ...links.flatMap(link => (link.description ? [link.description] : [])),
    '관리자 권한이면 전체 보고가 조회됩니다.',
  ].join(' ');

  return (
    <>
    <WorkListPage
      title="업무 보고"
      description={description}
      breadcrumbItems={[{ label: '나의 업무' }, { label: '업무 보고' }]}
      filterStateKey="work-hub"
      totalCount={isReportError ? undefined : reportData?.total}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {tabs.strip}
          {/* [게이트] 링크 기여는 라우트 게이트와 같은 판정(visibleWhen 의 page)으로만 보인다 — 라우트는 막는데 화면만 보이는
              비대칭은 조용히 죽는 결함이다(DEC-OPS-023 ②). */}
          {links.map(({ id, href, label, icon: Icon }) => (
            <Button key={id} asChild size="sm" variant="outline">
              <Link href={href}>
                {Icon && <Icon size={16} aria-hidden="true" />} {label}
              </Link>
            </Button>
          ))}
          <Button
            size="sm"
            disabled={reportAction !== null}
            onClick={() => setReportModalOpen(true)}
          >
            <Plus size={16} aria-hidden="true" /> 보고 등록
          </Button>
        </div>
      }
      filter={
        <KeywordFilter
          /*
            [2026-08-29] 라벨을 실제 검색 축으로 고친다.
            업무 보고: WorkReportRepositoryImpl 의 술어는 `rptTtl.contains(searchWrd)`
            하나뿐이라 작성자로는 좁혀지지 않는다.
          */
          label="보고 제목"
          placeholder="검색어를 입력하십시오..."
          value={searchKeyword}
          onSearch={(keyword) => { setSearchKeyword(keyword); setReportPage(1); }}
        />
      }
      toolbarActions={
        /* 지표 카드 3장을 한 줄 요약으로 수렴한다. */
        <span className="text-[length:var(--font-size-body)] text-muted-foreground">내가 작성한 보고(관리자는 전체)</span>
      }
    >
      {tabs.panel(
        <StandardDataTable
          columns={reportColumns}
          data={reports}
          loading={isReportLoading}
          emptyMessage={emptyResultMessage(searchKeyword, '등록된 업무 보고가 없습니다.')}
          error={isReportError ? (reportError instanceof Error ? reportError : new Error('업무 보고를 불러오지 못했습니다.')) : null}
          onRetry={() => void refetchReports()}
          pagination={{
            currentPage: reportPage,
            totalPages: Math.max(1, reportTotalPages),
            onPageChange: setReportPage,
            // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
            pageSize: pageUnit,
            onPageSizeChange: (size) => { setPageUnit(size); setReportPage(1); },
          }}
        />,
      )}
    </WorkListPage>

      {/* 업무 보고 등록 다이얼로그 */}
      <StandardModal
        isOpen={isReportModalOpen}
        onClose={requestCloseReport}
        closeDisabled={reportAction?.type === 'save'}
        title={editingReport ? '업무 보고 수정' : '업무 보고 등록'}
        maxWidth="lg"
      >
        <ReportCreateForm
          // key 로 모드 전환 시 폼을 새로 마운트해 기본값이 확실히 반영되게 한다.
          key={editingReport?.rptpSn ?? 'new'}
          mode={editingReport ? 'edit' : 'create'}
          initialData={editingReport ?? undefined}
          /*
            보고의 기본 일자는 서버 렌더 시점의 '오늘'(initialYmd)이다. 종전에는 세 라우트가 한 컴포넌트의 상태를 공유해 캘린더에서
            다른 달로 넘긴 뒤 보고를 등록하면 기본 일자가 그 달 1일이 됐다 — 화면을 나눈 지금은 캘린더 상태가 여기 닿지 않는다.
          */
          defaultYmd={initialYmd}
          onSubmit={handleSubmitReport}
          onCancel={requestCloseReport}
          onEditStateChange={handleReportEditState}
          isPending={reportAction?.type === 'save'}
        />
      </StandardModal>
    </>
  );
}
