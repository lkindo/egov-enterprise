'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FolderCog, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
;
import { useQuery, useQueryClient } from '@tanstack/react-query';
;
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';
import { reportService, type WorkReport } from '@/services/business/user/ReportService';
import { Calendar } from '@/components/ui/calendar';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { ScheduleCreateForm, type ScheduleFormValues } from '@/components/business/schedule/ScheduleCreateForm';
import { ReportCreateForm, type ReportFormValues } from '@/components/business/report/ReportCreateForm';
import { PRIORITY_LABEL } from '@/components/business/deptJob/DeptJobForm';
// sonner 직접 호출은 문자열 정규화 페일세이프가 없어 객체가 들어오면 '[object Object]' 가 노출된다.
import { useToast } from '@/app/components/ui/toast';
import { getDeptScheduleMonthList, createDeptSchedule, updateDeptSchedule, deleteDeptSchedule } from '@/services/business/schedule/deptScheduleService';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import type { DeptSchedule } from '@/types/business/schedule';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { useAuth } from '@/contexts/AuthContext';
import { isAdministrativeRole } from '@/lib/auth/administrative-role';
import { DeptJobBoxManageDialog } from '@/components/business/deptJob/DeptJobBoxManageDialog';

interface WorkHubClientProps {
  defaultTab?: string;
  /** 서버가 Asia/Seoul 기준으로 계산한 yyyyMMdd. SSR과 첫 클라이언트 렌더가 같은 날짜를 쓴다. */
  initialYmd: string;
}

/** 일정 날짜 컬럼(schdlBgngYmd/schdlEndYmd)은 varchar(8) 'yyyyMMdd' 다. 시각 정보는 스키마에 없다. */
function parseYmd(ymd?: string | null): Date | null {
  if (!ymd || ymd.length < 8) return null;
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  if (!y || !m || !d) return null;
  const parsed = new Date(y, m - 1, d);
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d
    ? parsed
    : null;
}

export default function WorkHubClient({ defaultTab = 'job', initialYmd }: WorkHubClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const queryTab = searchParams.get('tab');
  const initialTab = (queryTab === 'calendar' ? 'calendar' :
    queryTab === 'report' ? 'report' :
      (defaultTab || '').toLowerCase().includes('report') ? 'report' :
        (defaultTab || '').toLowerCase().includes('calendar') || (defaultTab || '').toLowerCase().includes('schedule') ? 'calendar' : 'job') as 'job' | 'report' | 'calendar';

  const [activeTab, setTabState] = useState<'job' | 'report' | 'calendar'>(initialTab);
  const [searchKeyword, setSearchKeyword] = useState('');
  // 타이핑 한 글자마다 서버 요청이 나가던 것을 300ms 디바운스한다.
  // 입력 컨트롤에는 원본 상태를, queryKey/요청 파라미터에는 디바운스 값만 쓴다.

  // 목록 페이지(1-based). 종전에는 페이저가 없어 상위 N건만 보이고 나머지는 도달할 수 없었다.
  const [jobPage, setJobPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  // 업무 목록의 소유 스코프. 기본은 '내 업무'(내가 담당자인 업무)이고, 토글로 부서 전체를 볼 수 있다.
  // 서버도 scope 미지정을 'mine' 으로 해석하므로 기본값이 양쪽에서 일치한다.
  const [jobScope, setJobScope] = useState<'mine' | 'dept'>('mine');
  /** 페이지당 건수 기본값(A1 필수 — 사용자가 바꿀 수 있다). URL 에는 싣지 않는다. */
  const [pageUnit, setPageUnit] = useState(10);
  // 캘린더 탭의 표시 기준 월. 월 이동 시 해당 월의 일정을 다시 조회한다.
  const initialDate = parseYmd(initialYmd);
  if (!initialDate) {
    throw new Error(`WorkHubClient initialYmd는 yyyyMMdd 실재 날짜여야 합니다: ${initialYmd}`);
  }
  const [currentDate, setCurrentDate] = useState(initialDate);
  // 캘린더에서 선택한 날짜(미선택 시 그 달 전체 일정을 목록에 보여준다).
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  // 일정 등록/수정 다이얼로그. 종전에는 '새 업무 생성' 버튼에 onClick 이 없어 등록 경로가 아예 없었고,
  // 등록이 열린 뒤에도 수정·삭제 수단이 없어 한번 만든 일정을 고치거나 지울 수 없었다.
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DeptSchedule | null>(null);
  // 업무 보고 등록 다이얼로그. 종전에는 이 탭의 '새 업무 생성' 버튼에 onClick 이 없었다.
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WorkReport | null>(null);
  const reportActionPendingRef = React.useRef(false);
  const scheduleActionPendingRef = React.useRef(false);
  const [reportAction, setReportAction] = useState<{ type: 'save' | 'delete'; id?: number } | null>(null);
  const [scheduleAction, setScheduleAction] = useState<{ type: 'save' | 'delete'; id?: number } | null>(null);
  const confirm = useConfirm();
  const { user } = useAuth();
  // [2026-09-06 DEC-OPS-037] 업무함 CRUD 는 서버가 @AdminOrSystem 이다. 표시 판정은 라우트 게이트와 같은 역할 집합
  //   (DEC-OPS-023 ②)을 쓴다 — 표시일 뿐 인가가 아니며, 관리자가 아니면 버튼 자체를 그리지 않는다(죽은 버튼 금지, G10).
  const canManageBoxes = isAdministrativeRole(user?.role);
  const [boxManageOpen, setBoxManageOpen] = useState(false);
  const { toast } = useToast();

  // URL 의 tab 쿼리와 탭 상태를 동기화한다.
  // activeTab 은 useState(initialTab) 이라 '최초 마운트' 때만 쿼리를 읽는다. 그래서 이미 이 화면에
  // 있는 상태에서 사이드바의 '일정 관리'(?tab=calendar) 같은 링크를 누르면, 클라이언트 내비게이션이
  // 컴포넌트를 언마운트하지 않으므로 URL 만 바뀌고 화면은 이전 탭에 머물렀다.
  React.useEffect(() => {
    const q = searchParams.get('tab');
    if (q === 'job' || q === 'report' || q === 'calendar') {
      setTabState((prev) => (prev === q ? prev : q));
    }
  }, [searchParams]);

  // 탭 ↔ 라우트 대응. 세 탭은 각자 고유 경로를 가지며, 그 경로가 그대로 사이드바 메뉴 항목이다.
  //
  // [왜 경로인가] 종전에는 setTab 이 '/admin/work-hub?tab=...' 을 **하드코딩**해 두 가지 문제가 있었다.
  //  ① 스마트 툴킷 허브 쪽 경로(/smart-toolkit/*)로 들어와 탭을 누르면 URL 이 /admin/work-hub 로
  //     튕겨나가 돌아올 UI 경로가 없었다(편도 진입점).
  //  ② 세 메뉴가 같은 경로에 쿼리만 달라, 사이드바의 활성 표시가 쿼리 일치에 의존하는 취약한
  //     구조였다. "다른 메뉴를 눌렀는데 엉뚱한 메뉴가 활성" 증상의 근본 원인이 이것이었다.
  // 탭마다 실제 경로를 부여하면 두 문제가 함께 사라지고, 북마크·딥링크도 자연스러워진다.
  const TAB_ROUTES: Record<'job' | 'report' | 'calendar', string> = {
    job: '/smart-toolkit/dept-job',
    report: '/smart-toolkit/work-report',
    calendar: '/smart-toolkit/schedule',
  };

  const setTab = (tab: 'job' | 'report' | 'calendar') => {
    setTabState(tab);
    router.push(TAB_ROUTES[tab], { scroll: false });
  };

  // ⚠ 종전에는 getDeptJobBoxes(업무'함')를 조회했다. 그런데 이 탭의 '업무 등록' 버튼은
  //   부서 업무(DeptJob)를 만든다 — 서로 다른 엔티티라, 등록한 업무가 목록에 영원히 나타나지 않았다.
  //   탭 설명("부서별 업무 흐름")과 등록 동작이 모두 부서 업무를 가리키므로 목록을 그쪽에 맞춘다.
  //   업무함은 부서 단위 구조물이고 CRUD 가 관리자 전용(@AdminOrSystem)이라 이 화면의 대상이 아니다.
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
    enabled: activeTab === 'job'
  });
  const jobs = jobData?.list || [];
  const jobTotalPages = jobData?.totalPage ?? 1;

  const {
    data: reportData,
    isLoading: isReportLoading,
    isError: isReportError,
    error: reportError,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['work-reports', searchKeyword, reportPage, pageUnit],
    queryFn: () => reportService.getReports({ pageIndex: reportPage, pageUnit, searchWrd: searchKeyword }),
    enabled: activeTab === 'report'
  });
  const reports = reportData?.list || [];
  const reportTotalPages = reportData?.totalPage ?? 1;

  // ⚠ yearMonth 는 반드시 하이픈 없는 'yyyyMM'(6자)여야 한다.
  //   ScheduleRepository.findMonthlySchedules 가 CONCAT(:yearMonth,'01') / CONCAT(:yearMonth,'31') 로
  //   varchar(8) 'yyyyMMdd' 컬럼과 문자열 비교하므로, 'yyyy-MM' 을 보내면 예외 없이 조용히 0건이 된다.
  //   (deptScheduleService 의 JSDoc 이 'YYYY-MM' 이라 적혀 있으나 오기다.)
  const yearMonth = format(currentDate, 'yyyyMM');
  const {
    data: scheduleData,
    isLoading: isScheduleLoading,
    isError: isScheduleError,
    error: scheduleError,
    refetch: refetchSchedules,
  } = useQuery({
    queryKey: ['work-schedules', yearMonth],
    queryFn: () => getDeptScheduleMonthList({ yearMonth }),
    enabled: activeTab === 'calendar',
  });
  // /monthly 는 PageResponse 가 아니라 배열을 그대로 반환한다.
  const schedules: DeptSchedule[] = scheduleData || [];

  /** 일정이 하나라도 있는 날짜들 — 캘린더 셀에 마커를 찍는 데 쓴다. */
  const scheduleDates = useMemo(
    () => schedules.map((s) => parseYmd(s.schdlBgngYmd)).filter((d): d is Date => d !== null),
    [schedules]
  );

  /** 선택한 날짜의 일정(미선택이면 그 달 전체). 일정은 일 단위라 시작일 기준으로 매칭한다. */
  const visibleSchedules = useMemo(() => {
    if (!selectedDate) return schedules;
    const key = format(selectedDate, 'yyyyMMdd');
    return schedules.filter((s) => {
      const begin = s.schdlBgngYmd?.slice(0, 8);
      const end = (s.schdlEndYmd || s.schdlBgngYmd)?.slice(0, 8);
      return !!begin && !!end && begin <= key && key <= end;
    });
  }, [schedules, selectedDate]);

  /** 업무 보고 등록. 작성자(userId)는 서버가 인증 주체로 채우므로 보내지 않는다. */
  const handleSubmitReport = async (values: ReportFormValues) => {
    if (reportActionPendingRef.current) return;
    reportActionPendingRef.current = true;
    setReportAction({ type: 'save', id: editingReport?.rptpSn });
    try {
      if (editingReport?.rptpSn) {
        await reportService.updateReport(editingReport.rptpSn, values);
        toast('업무 보고가 수정되었습니다.', 'success');
      } else {
        await reportService.createReport(values as Parameters<typeof reportService.createReport>[0]);
        toast('업무 보고가 등록되었습니다.', 'success');
      }
      setReportModalOpen(false);
      setEditingReport(null);
      await queryClient.invalidateQueries({ queryKey: ['work-reports'] });
    } catch (error) {
      if (extractFieldErrors(error)) throw error;
      toast(error instanceof Error ? error.message : '업무 보고 저장 중 오류가 발생했습니다.', 'error');
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
    } catch {
      toast('삭제에 실패했습니다. 작성자 본인 또는 관리자만 삭제할 수 있습니다.', 'error');
    } finally {
      reportActionPendingRef.current = false;
      setReportAction(null);
    }
  };

  /**
   * 일정 등록. 캘린더에서 날짜를 선택했으면 그 날짜가 기본값이 된다.
   * 담당자(schdlPicId)·부서(schdlDeptId)·PK 는 서버가 인증 주체 기준으로 채우므로 보내지 않는다.
   */
  const handleSubmitSchedule = async (values: ScheduleFormValues) => {
    if (scheduleActionPendingRef.current) return;
    scheduleActionPendingRef.current = true;
    setScheduleAction({ type: 'save', id: editingSchedule?.schdlSn });
    try {
      if (editingSchedule?.schdlSn) {
        await updateDeptSchedule(editingSchedule.schdlSn, values as Parameters<typeof updateDeptSchedule>[1]);
        toast('일정이 수정되었습니다.', 'success');
      } else {
        await createDeptSchedule(values as Parameters<typeof createDeptSchedule>[0]);
        toast('일정이 등록되었습니다.', 'success');
      }
      setScheduleModalOpen(false);
      setEditingSchedule(null);
      // 저장 오류는 ScheduleCreateForm이 필드 귀속/일반 안내를 단독 처리한다.
      // 성공한 경우에만 현재 보고 있는 달의 일정을 다시 불러온다.
      await queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
    } finally {
      scheduleActionPendingRef.current = false;
      setScheduleAction(null);
    }
  };

  /** 일정 삭제. 서버는 소유자/관리자만 허용하므로 권한 오류 메시지를 그대로 노출한다. */
  const handleDeleteSchedule = async (item: DeptSchedule) => {
    if (!item.schdlSn || scheduleActionPendingRef.current) return;
    scheduleActionPendingRef.current = true;
    setScheduleAction({ type: 'delete', id: item.schdlSn });
    try {
      const ok = await confirm({
        title: '일정 삭제',
        message: `'${item.schdlNm || '제목 없음'}' 일정을 삭제하시겠습니까?`,
        variant: 'destructive',
        confirmText: '삭제',
      });
      if (!ok) return;
      await deleteDeptSchedule(item.schdlSn);
      toast('일정이 삭제되었습니다.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
    } catch (error) {
      toast(error instanceof Error ? error.message : '일정 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      scheduleActionPendingRef.current = false;
      setScheduleAction(null);
    }
  };

  const scheduleColumns: Column<DeptSchedule>[] = [
    {
      header: '일자',
      accessor: (item) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {item.schdlBgngYmd ? format(parseYmd(item.schdlBgngYmd) as Date, 'MM.dd (E)', { locale: ko }) : '-'}
        </span>
      ),
      className: 'w-32',
    },
    {
      header: '일정명',
      accessor: (item) => <span className="font-bold tracking-tight">{item.schdlNm || '(제목 없음)'}</span>,
    },
    {
      header: '장소',
      accessor: (item) => <span className="text-sm text-muted-foreground">{item.schdlPlcNm || '-'}</span>,
      className: 'w-48',
    },
    {
      header: '관리',
      accessor: (item) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            data-testid="schedule-edit"
            aria-label={`${item.schdlNm || '제목 없음'} 일정 수정`}
            disabled={scheduleAction !== null}
            className="h-8 px-3 text-[10px] font-black uppercase"
            onClick={() => { setEditingSchedule(item); setScheduleModalOpen(true); }}
          >
            수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-testid="schedule-delete"
            aria-label={`${item.schdlNm || '제목 없음'} 일정 ${scheduleAction?.type === 'delete' && scheduleAction.id === item.schdlSn ? '삭제 중' : '삭제'}`}
            aria-busy={scheduleAction?.type === 'delete' && scheduleAction.id === item.schdlSn || undefined}
            disabled={scheduleAction !== null}
            className="h-8 px-3 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500 hover:text-white"
            onClick={() => handleDeleteSchedule(item)}
          >
            삭제
          </Button>
        </div>
      ),
      className: 'w-40 text-right',
    },
  ];

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
      // 종전에는 onClick 이 없는 死버튼이었다. 상세 화면이 수정·삭제를 모두 제공하므로 그리로 보낸다.
      header: '관리',
      accessor: (item) => (
        <div className="flex justify-end pr-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 font-bold text-[11px]"
            aria-label={`${item.deptTaskNm || '업무'} 상세 보기`}
            onClick={() => router.push(`/smart-toolkit/dept-job/${item.deptTaskSn}`)}
          >
            상세
          </Button>
        </div>
      ),
      className: 'w-24 text-right'
    }
  ];

  const reportColumns: Column<WorkReport>[] = [
    {
      header: '번호',
      accessor: (_, index) => <span className="font-mono text-xs font-bold text-muted-foreground">{(index! + 1).toString().padStart(2, '0')}</span>,
      className: 'w-20 text-center'
    },
    {
      header: '보고서 제목',
      accessor: (item) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.rptTtl}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">작성일: {item.rptYmd}</span>
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
            className="h-9 font-bold text-[11px]"
            aria-label={`${item.rptTtl || '제목 없음'} 보고 수정`}
            disabled={reportAction !== null}
            onClick={() => { setEditingReport(item); setReportModalOpen(true); }}
          >
            수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 font-bold text-[11px] text-rose-600 hover:text-rose-700"
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

  const TAB_LABEL = { job: '업무 워크플로우', report: '업무 보고', calendar: '일정 캘린더' } as const;
  const activeTotal = activeTab === 'job' ? jobData?.total : activeTab === 'report' ? reportData?.total : schedules.length;
  const activeError = activeTab === 'job' ? isJobError : activeTab === 'report' ? isReportError : isScheduleError;

  return (
    <>
    <WorkListPage
      title="워크플로우 및 자산 관리"
      description={
        activeTab === 'calendar'
          ? '월간 일정을 조회합니다. 날짜를 선택하면 그 날짜의 일정만 표시합니다.'
          : activeTab === 'job'
            ? '부서 업무의 담당자·우선순위·업무함을 조회합니다.'
            : '내가 작성한 업무 보고를 조회합니다. 관리자 권한이면 전체 보고가 조회됩니다.'
      }
      breadcrumbItems={[{ label: '업무관리' }, { label: '워크허브' }]}
      filterStateKey="work-hub"
      /* 일정은 월 단위 조회라 서버 총계가 없다 — 현재 월 건수임을 툴바 문구가 밝힌다. */
      totalCount={activeError ? undefined : activeTotal}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="워크허브 영역 선택" className="flex rounded-md border border-border p-0.5">
            {(['job', 'report', 'calendar'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`work-hub-tab-${tab}`}
                aria-selected={activeTab === tab}
                aria-controls="work-hub-tabpanel"
                onClick={() => setTab(tab)}
                className={cn(
                  'flex h-[var(--control-h-sm)] items-center rounded px-4 text-xs font-bold transition-colors',
                  activeTab === tab ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {TAB_LABEL[tab]}
              </button>
            ))}
          </div>
          {/* 탭마다 '등록'의 대상이 다르다. 일정·보고는 다이얼로그로 받고,
              업무는 전용 등록 화면이 이미 있어 그리로 보낸다. */}
          {activeTab === 'job' ? (
            <>
              {canManageBoxes && (
                <Button size="sm" variant="outline" onClick={() => setBoxManageOpen(true)}>
                  <FolderCog size={16} aria-hidden="true" /> 업무함 관리
                </Button>
              )}
              <Button asChild size="sm">
                <Link href="/smart-toolkit/dept-job/create">
                  <Plus size={16} aria-hidden="true" /> 업무 등록
                </Link>
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              disabled={activeTab === 'calendar' ? scheduleAction !== null : reportAction !== null}
              onClick={activeTab === 'calendar' ? () => setScheduleModalOpen(true) : () => setReportModalOpen(true)}
            >
              <Plus size={16} aria-hidden="true" /> {activeTab === 'calendar' ? '일정 등록' : '보고 등록'}
            </Button>
          )}
        </div>
      }
      filter={
        /* 일정은 월 단위 조회라 키워드 검색 대상이 아니다 — 동작하지 않는 입력을 만들지 않는다. */
        activeTab === 'calendar' ? undefined : (
          <KeywordFilter
            /*
              [2026-08-29] 라벨을 실제 검색 축으로 고친다.
              - 업무: 서버가 붙일 수 있는 축은 업무명·내용·담당자ID 셋인데 담당자 축은 이름이
                아니라 picId(계정 식별자)다. 이름으로 찾으리라 기대하면 계속 0건이 나오므로
                약속하지 않는다. 지금 보내는 축은 업무명이다.
              - 업무 보고: WorkReportRepositoryImpl 의 술어는 `rptTtl.contains(searchWrd)`
                하나뿐이라 작성자로는 좁혀지지 않는다.
            */
            label={activeTab === 'job' ? '업무명' : '보고 제목'}
            placeholder="검색어를 입력하십시오..."
            value={searchKeyword}
            onSearch={(keyword) => { setSearchKeyword(keyword); setJobPage(1); setReportPage(1); }}
          >
            {/* 업무 탭에만 소유 범위 조건을 둔다. 보고 탭은 별도 소유 모델이라 대상이 아니다. */}
            {activeTab === 'job' && (
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
            )}
          </KeywordFilter>
        )
      }
      toolbarActions={
        /* 지표 카드 3장을 한 줄 요약으로 수렴한다. 일정은 서버 총계가 없어 범위를 문구로 밝힌다. */
        <span className="text-[length:var(--font-size-body)] text-muted-foreground">
          {activeTab === 'calendar'
            ? `${format(currentDate, 'yyyy년 M월', { locale: ko })} 기준`
            : activeTab === 'job'
              ? (jobScope === 'mine' ? '내가 담당인 업무' : '부서 전체 업무')
              : '내가 작성한 보고(관리자는 전체)'}
        </span>
      }
    >
      <div role="tabpanel" id="work-hub-tabpanel" aria-labelledby={`work-hub-tab-${activeTab}`}>
        {activeTab === 'calendar' ? (
          <div className="grid items-start gap-6 lg:grid-cols-[auto_1fr]">
            <div className="rounded-md border border-border bg-card p-[var(--filter-pad)]">
              <Calendar
                mode="single"
                locale={ko}
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentDate}
                onMonthChange={(month) => { setCurrentDate(month); setSelectedDate(undefined); }}
                fixedWeeks
                // 일정이 있는 날에 강조 표시. modifiersClassNames 는 클래스 1개만 붙일 수 있어
                // '건수' 같은 가변 정보는 표현할 수 없다(react-day-picker v9 제약).
                modifiers={{ hasSchedule: scheduleDates }}
                modifiersClassNames={{ hasSchedule: 'font-bold text-primary underline decoration-2 underline-offset-4' }}
                // 래퍼 기본 셀 크기는 Popover 선택기용(h-9 w-9)이라 월간 뷰에 맞게 키운다.
                // calendar.tsx 가 호출자 classNames 를 뒤에 스프레드하므로 이 값이 이긴다.
                classNames={{
                  months: 'relative flex flex-col',
                  month_grid: 'w-full border-collapse',
                  day: 'h-12 w-12 text-center p-0',
                  day_button: 'e2e-day-button h-12 w-12 rounded-lg font-bold hover:bg-muted transition-colors',
                  weekday: 'w-12 text-[11px] font-bold uppercase text-muted-foreground',
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {selectedDate
                    ? `${format(selectedDate, 'yyyy년 M월 d일 (E)', { locale: ko })} 일정`
                    : `${format(currentDate, 'yyyy년 M월', { locale: ko })} 전체 일정`}
                </h2>
                {selectedDate && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(undefined)}>
                    전체 보기
                  </Button>
                )}
              </div>
              <StandardDataTable
                columns={scheduleColumns}
                data={visibleSchedules}
                loading={isScheduleLoading}
                keyField="schdlSn"
                emptyMessage="등록된 일정이 없습니다."
                // 조회 실패를 '데이터 없음'으로 위장하지 않는다.
                error={isScheduleError ? (scheduleError instanceof Error ? scheduleError : new Error('일정을 불러오지 못했습니다.')) : null}
                onRetry={() => void refetchSchedules()}
              />
            </div>
          </div>
        ) : activeTab === 'job' ? (
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
        ) : (
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
          />
        )}
      </div>
    </WorkListPage>

      {/* 일정 등록 다이얼로그 — 캘린더에서 선택한 날짜가 기본값이 된다. */}
      <StandardModal
        isOpen={isScheduleModalOpen}
        onClose={() => { setScheduleModalOpen(false); setEditingSchedule(null); }}
        closeDisabled={scheduleAction?.type === 'save'}
        title={editingSchedule ? '일정 수정' : '일정 등록'}
        maxWidth="lg"
      >
        <ScheduleCreateForm
          // key 로 모드 전환 시 폼을 새로 마운트해 기본값이 확실히 반영되게 한다.
          key={editingSchedule?.schdlSn ?? 'new'}
          mode={editingSchedule ? 'edit' : 'create'}
          initialData={editingSchedule ?? undefined}
          defaultYmd={format(selectedDate ?? currentDate, 'yyyyMMdd')}
          onSubmit={handleSubmitSchedule}
          onCancel={() => { setScheduleModalOpen(false); setEditingSchedule(null); }}
          isPending={scheduleAction?.type === 'save'}
        />
      </StandardModal>

      {/* 업무 보고 등록 다이얼로그 */}
      <StandardModal
        isOpen={isReportModalOpen}
        onClose={() => { setReportModalOpen(false); setEditingReport(null); }}
        closeDisabled={reportAction?.type === 'save'}
        title={editingReport ? '업무 보고 수정' : '업무 보고 등록'}
        maxWidth="lg"
      >
        <ReportCreateForm
          // key 로 모드 전환 시 폼을 새로 마운트해 기본값이 확실히 반영되게 한다(일정 폼과 동일).
          key={editingReport?.rptpSn ?? 'new'}
          mode={editingReport ? 'edit' : 'create'}
          initialData={editingReport ?? undefined}
          defaultYmd={format(currentDate, 'yyyyMMdd')}
          onSubmit={handleSubmitReport}
          onCancel={() => { setReportModalOpen(false); setEditingReport(null); }}
          isPending={reportAction?.type === 'save'}
        />
      </StandardModal>
      {/* 열릴 때만 마운트한다 — 닫으면 폼·선택 상태가 함께 버려지고, 다이얼로그의 조회 훅이 허브 렌더에 끼지 않는다. */}
      {canManageBoxes && boxManageOpen && (
        <DeptJobBoxManageDialog isOpen onClose={() => setBoxManageOpen(false)} />
      )}
    </>
  );
}
