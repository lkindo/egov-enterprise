'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Briefcase,
  Search,
  ClipboardList,
  FileText,
  Activity,
  Plus,
  Layers,
  RefreshCcw,
  CalendarDays,
  MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';
;
import { useQuery, useQueryClient } from '@tanstack/react-query';
;
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';
import { reportService } from '@/services/business/user/ReportService';
import { Calendar } from '@/components/ui/calendar';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { ScheduleCreateForm, type ScheduleFormValues } from '@/components/business/schedule/ScheduleCreateForm';
import { ReportCreateForm, type ReportFormValues } from '@/components/business/report/ReportCreateForm';
import { PRIORITY_LABEL } from '@/components/business/deptJob/DeptJobForm';
import { toast } from 'sonner';
import { getDeptScheduleMonthList, createDeptSchedule, updateDeptSchedule, deleteDeptSchedule } from '@/services/business/schedule/deptScheduleService';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import type { DeptSchedule } from '@/types/business/schedule';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

/** 일정 날짜 컬럼(schdlBgngYmd/schdlEndYmd)은 varchar(8) 'yyyyMMdd' 다. 시각 정보는 스키마에 없다. */
function parseYmd(ymd?: string | null): Date | null {
  if (!ymd || ymd.length < 8) return null;
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export default function WorkHubClient({ jobs: initialJobs = [], reports: initialReports = [], defaultTab = 'job' }: any) {
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
  // 목록 페이지(1-based). 종전에는 페이저가 없어 상위 N건만 보이고 나머지는 도달할 수 없었다.
  const [jobPage, setJobPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  // 업무 목록의 소유 스코프. 기본은 '내 업무'(내가 담당자인 업무)이고, 토글로 부서 전체를 볼 수 있다.
  // 서버도 scope 미지정을 'mine' 으로 해석하므로 기본값이 양쪽에서 일치한다.
  const [jobScope, setJobScope] = useState<'mine' | 'dept'>('mine');
  const PAGE_UNIT = 10;
  // 캘린더 탭의 표시 기준 월. 월 이동 시 해당 월의 일정을 다시 조회한다.
  const [currentDate, setCurrentDate] = useState(new Date());
  // 캘린더에서 선택한 날짜(미선택 시 그 달 전체 일정을 목록에 보여준다).
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  // 일정 등록/수정 다이얼로그. 종전에는 '새 업무 생성' 버튼에 onClick 이 없어 등록 경로가 아예 없었고,
  // 등록이 열린 뒤에도 수정·삭제 수단이 없어 한번 만든 일정을 고치거나 지울 수 없었다.
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DeptSchedule | null>(null);
  // 업무 보고 등록 다이얼로그. 종전에는 이 탭의 '새 업무 생성' 버튼에 onClick 이 없었다.
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const confirm = useConfirm();

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
  const { data: jobData, isLoading: isJobLoading } = useQuery({
    // jobScope 를 queryKey 에 포함해야 토글 시 재조회된다. 빠뜨리면 캐시된 이전 스코프 결과가
    // 그대로 남아 "토글이 먹지 않는" 것처럼 보인다.
    queryKey: ['work-jobs', searchKeyword, jobPage, jobScope],
    queryFn: () => deptJobUserService.getDeptJobList({ searchWrd: searchKeyword, pageIndex: jobPage, pageUnit: PAGE_UNIT, scope: jobScope }),
    enabled: activeTab === 'job'
  });
  const jobs = jobData?.list || [];
  const jobTotalPages = jobData?.totalPage ?? 1;

  const { data: reportData, isLoading: isReportLoading } = useQuery({
    queryKey: ['work-reports', searchKeyword, reportPage],
    queryFn: () => reportService.getReports({ pageIndex: reportPage, pageUnit: PAGE_UNIT, searchWrd: searchKeyword }),
    enabled: activeTab === 'report'
  });
  const reports = reportData?.list || [];
  const reportTotalPages = reportData?.totalPage ?? 1;

  // ⚠ yearMonth 는 반드시 하이픈 없는 'yyyyMM'(6자)여야 한다.
  //   ScheduleRepository.findMonthlySchedules 가 CONCAT(:yearMonth,'01') / CONCAT(:yearMonth,'31') 로
  //   varchar(8) 'yyyyMMdd' 컬럼과 문자열 비교하므로, 'yyyy-MM' 을 보내면 예외 없이 조용히 0건이 된다.
  //   (deptScheduleService 의 JSDoc 이 'YYYY-MM' 이라 적혀 있으나 오기다.)
  const yearMonth = format(currentDate, 'yyyyMM');
  const { data: scheduleData, isLoading: isScheduleLoading } = useQuery({
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
    try {
      if (editingReport?.rptId) {
        await reportService.updateReport(editingReport.rptId, values);
        toast.success('업무 보고가 수정되었습니다.');
      } else {
        await reportService.createReport(values as Parameters<typeof reportService.createReport>[0]);
        toast.success('업무 보고가 등록되었습니다.');
      }
      setReportModalOpen(false);
      setEditingReport(null);
      await queryClient.invalidateQueries({ queryKey: ['work-reports'] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '업무 보고 저장 중 오류가 발생했습니다.');
    }
  };

  /** 보고 삭제. 서버가 작성자 본인 또는 관리자만 허용하므로 실패는 그대로 알린다. */
  const handleDeleteReport = async (item: any) => {
    const ok = await confirm({
      title: '업무 보고 삭제',
      message: `'${item.rptTtl || '제목 없음'}' 보고를 삭제하시겠습니까?`,
      variant: 'destructive',
      confirmText: '삭제',
    });
    if (!ok) return;
    try {
      await reportService.deleteReport(item.rptId);
      toast.success('업무 보고가 삭제되었습니다.');
      await queryClient.invalidateQueries({ queryKey: ['work-reports'] });
    } catch (error) {
      toast.error('삭제에 실패했습니다. 작성자 본인 또는 관리자만 삭제할 수 있습니다.');
    }
  };

  /**
   * 일정 등록. 캘린더에서 날짜를 선택했으면 그 날짜가 기본값이 된다.
   * 담당자(schdlPicId)·부서(schdlDeptId)·PK 는 서버가 인증 주체 기준으로 채우므로 보내지 않는다.
   */
  const handleSubmitSchedule = async (values: ScheduleFormValues) => {
    try {
      if (editingSchedule?.schdlId) {
        await updateDeptSchedule(editingSchedule.schdlId, values as Parameters<typeof updateDeptSchedule>[1]);
        toast.success('일정이 수정되었습니다.');
      } else {
        await createDeptSchedule(values as Parameters<typeof createDeptSchedule>[0]);
        toast.success('일정이 등록되었습니다.');
      }
      setScheduleModalOpen(false);
      setEditingSchedule(null);
      // 현재 보고 있는 달의 일정을 다시 불러온다.
      await queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '일정 저장 중 오류가 발생했습니다.');
    }
  };

  /** 일정 삭제. 서버는 소유자/관리자만 허용하므로 권한 오류 메시지를 그대로 노출한다. */
  const handleDeleteSchedule = async (item: DeptSchedule) => {
    if (!item.schdlId) return;
    const ok = await confirm({
      title: '일정 삭제',
      message: `'${item.schdlNm || '제목 없음'}' 일정을 삭제하시겠습니까?`,
      variant: 'destructive',
      confirmText: '삭제',
    });
    if (!ok) return;
    try {
      await deleteDeptSchedule(item.schdlId);
      toast.success('일정이 삭제되었습니다.');
      await queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '일정 삭제 중 오류가 발생했습니다.');
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
            className="h-8 px-3 text-[10px] font-black uppercase"
            onClick={() => { setEditingSchedule(item); setScheduleModalOpen(true); }}
          >
            수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-testid="schedule-delete"
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
        <Link href={`/smart-toolkit/dept-job/${item.deptTaskId}`} className="flex flex-col gap-1 py-1">
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
            onClick={() => router.push(`/smart-toolkit/dept-job/${item.deptTaskId}`)}
          >
            상세
          </Button>
        </div>
      ),
      className: 'w-24 text-right'
    }
  ];

  const reportColumns: Column<any>[] = [
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
      accessor: (item) => <span className="text-xs font-bold text-muted-foreground tracking-tight">{item.userId}</span>,
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
            onClick={() => { setEditingReport(item); setReportModalOpen(true); }}
          >
            수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 font-bold text-[11px] text-rose-600 hover:text-rose-700"
            onClick={() => handleDeleteReport(item)}
          >
            삭제
          </Button>
        </div>
      ),
      className: 'w-32 text-right'
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="워크플로우 및 자산 관리"
        breadcrumbs={[{ label: '업무관리' }, { label: '워크허브' }]}
      />

      <HubHeader
        title="업무 및"
        highlight="인텔리전스"
        subtitle="전사 업무 프로세스 및 비즈니스 데이터 자산을 통합 관리합니다."
        icon={Briefcase}
        actions={
          <div className="flex gap-4">
             <div className="flex bg-muted p-1 rounded-xl border border-border/50">
               <Button
                 variant="ghost"
                 size="sm"
                 className={cn("h-8 rounded-lg px-6 text-[10px] font-black uppercase transition-all", activeTab === 'job' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                 onClick={() => setTab('job')}
               >
                 워크플로우
               </Button>
               <Button
                 variant="ghost"
                 size="sm"
                 className={cn("h-8 rounded-lg px-6 text-[10px] font-black uppercase transition-all", activeTab === 'report' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                 onClick={() => setTab('report')}
               >
                 업무 보고
               </Button>
               <Button
                 variant="ghost"
                 size="sm"
                 className={cn("h-8 rounded-lg px-6 text-[10px] font-black uppercase transition-all", activeTab === 'calendar' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                 onClick={() => setTab('calendar')}
               >
                 일정
               </Button>
             </div>
            {/* 탭마다 '생성'의 대상이 다르다. 일정·보고는 다이얼로그로 받고,
                업무 워크플로우는 전용 등록 화면이 이미 있어 그리로 보낸다. */}
            <Button
              onClick={
                activeTab === 'calendar'
                  ? () => setScheduleModalOpen(true)
                  : activeTab === 'report'
                    ? () => setReportModalOpen(true)
                    : () => router.push('/smart-toolkit/dept-job/create')
              }
              className="h-11 px-8 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl"
            >
              <Plus size={18} /> {activeTab === 'calendar' ? '일정 등록' : activeTab === 'report' ? '보고 등록' : '업무 등록'}
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="업무 노드" value={jobData?.total ?? jobs.length} icon={Layers} color="primary" />
        <HubMetricCard title="보고 데이터" value={reportData?.total ?? reports.length} icon={FileText} color="amber" />
        <HubMetricCard title="이번 달 일정" value={schedules.length} icon={CalendarDays} color="indigo" />
        <HubMetricCard title="동기화 빈도" value="매일" icon={RefreshCcw} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard
        title={activeTab === 'calendar' ? "일정 캘린더" : activeTab === 'job' ? "업무 워크플로우 매트릭스" : "업무 보고 아카이브"}
        description={activeTab === 'calendar' ? "월간 일정 현황입니다. 날짜를 선택하면 해당 일자의 일정만 추려 보여줍니다." : activeTab === 'job' ? "부서별 업무 흐름 및 처리 상태에 대한 실시간 스트림입니다." : "조직 내에서 생성된 업무 보고의 명세입니다."}
        icon={activeTab === 'calendar' ? CalendarDays : activeTab === 'job' ? ClipboardList : FileText}
        className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
      >
        <div className="space-y-8">
          {/* 검색은 서버 필터가 있는 업무/보고 탭에만 노출한다. 일정은 월 단위 조회라 검색 대상이 아니다. */}
          {activeTab !== 'calendar' && (
            <div className="flex items-center justify-between px-2 pt-2 border-b border-border/50 pb-10 mb-8">
              <div className="relative group max-w-xl w-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                <Input
                  value={searchKeyword}
                  onChange={(e) => { setSearchKeyword(e.target.value); setJobPage(1); setReportPage(1); }}
                  className="h-11 bg-muted/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="검색어를 입력하십시오..."
                />
              </div>

              {/* 업무 탭에만 소유 스코프 토글을 둔다. 보고 탭은 별도 소유 모델이라 대상이 아니다.
                  상단 탭 전환과 동일한 pill 패턴을 재사용해 조작 방식을 일관되게 한다. */}
              {activeTab === 'job' && (
                <div className="flex bg-muted p-1 rounded-xl border border-border/50 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={jobScope === 'mine'}
                    className={cn("h-8 rounded-lg px-5 text-[10px] font-black uppercase transition-all", jobScope === 'mine' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                    onClick={() => { setJobScope('mine'); setJobPage(1); }}
                  >
                    내 업무
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={jobScope === 'dept'}
                    className={cn("h-8 rounded-lg px-5 text-[10px] font-black uppercase transition-all", jobScope === 'dept' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                    onClick={() => { setJobScope('dept'); setJobPage(1); }}
                  >
                    부서 전체
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="min-h-[500px]">
            {activeTab === 'calendar' ? (
              <div className="grid gap-10 lg:grid-cols-[auto_1fr] items-start">
                <div className="rounded-[var(--radius-hub-item)] border border-border/50 bg-card/60 p-6 shadow-inner">
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
                    modifiersClassNames={{ hasSchedule: 'font-black text-primary underline decoration-2 underline-offset-4' }}
                    // 래퍼 기본 셀 크기는 Popover 선택기용(h-9 w-9)이라 월간 뷰에 맞게 키운다.
                    // calendar.tsx 가 호출자 classNames 를 뒤에 스프레드하므로 이 값이 이긴다.
                    classNames={{
                      months: 'relative flex flex-col',
                      month_grid: 'w-full border-collapse',
                      day: 'h-12 w-12 text-center p-0',
                      day_button: 'e2e-day-button h-12 w-12 rounded-lg font-bold hover:bg-muted transition-colors',
                      weekday: 'w-12 text-[11px] font-black uppercase text-muted-foreground',
                    }}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-sm font-black tracking-tight text-foreground">
                      {selectedDate
                        ? `${format(selectedDate, 'yyyy년 M월 d일 (E)', { locale: ko })} 일정`
                        : `${format(currentDate, 'yyyy년 M월', { locale: ko })} 전체 일정`}
                    </h4>
                    {selectedDate && (
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase" onClick={() => setSelectedDate(undefined)}>
                        전체 보기
                      </Button>
                    )}
                  </div>
                  <StandardDataTable
                    columns={scheduleColumns}
                    data={visibleSchedules}
                    loading={isScheduleLoading}
                    keyField="schdlId"
                    emptyMessage="등록된 일정이 없습니다."
                    isPremium={true}
                    className="border-none bg-transparent shadow-none"
                  />
                </div>
              </div>
            ) : (
              <StandardDataTable
                columns={activeTab === 'job' ? jobColumns : reportColumns}
                data={activeTab === 'job' ? jobs : reports}
                loading={activeTab === 'job' ? isJobLoading : isReportLoading}
                // 목록이 '내 업무'로 좁혀진 상태의 빈 화면은 데이터 유실처럼 보이기 쉽다.
                // 왜 비었는지와 다음 행동('부서 전체' 토글)을 문구로 알려 준다.
                emptyMessage={
                  activeTab === 'job' && jobScope === 'mine'
                    ? '내가 담당자인 업무가 없습니다. 부서 전체를 보려면 상단의 \'부서 전체\'를 선택하십시오.'
                    : '식별된 데이터 유닛이 없습니다.'
                }
                isPremium={true}
                className="border-none bg-transparent shadow-none"
                // StandardDataTable 은 처음부터 pagination 을 지원했는데 전달하지 않고 있었다.
                // 그래서 첫 페이지 밖의 데이터에 도달할 방법이 아예 없었다.
                pagination={{
                  currentPage: activeTab === 'job' ? jobPage : reportPage,
                  totalPages: Math.max(1, activeTab === 'job' ? jobTotalPages : reportTotalPages),
                  onPageChange: (p: number) => (activeTab === 'job' ? setJobPage(p) : setReportPage(p)),
                }}
              />
            )}
          </div>
        </div>
      </HubSectionCard>

      {/* 일정 등록 다이얼로그 — 캘린더에서 선택한 날짜가 기본값이 된다. */}
      <StandardModal
        isOpen={isScheduleModalOpen}
        onClose={() => { setScheduleModalOpen(false); setEditingSchedule(null); }}
        title={editingSchedule ? '일정 수정' : '일정 등록'}
        maxWidth="lg"
      >
        <ScheduleCreateForm
          // key 로 모드 전환 시 폼을 새로 마운트해 기본값이 확실히 반영되게 한다.
          key={editingSchedule?.schdlId ?? 'new'}
          mode={editingSchedule ? 'edit' : 'create'}
          initialData={editingSchedule ?? undefined}
          defaultYmd={format(selectedDate ?? currentDate, 'yyyyMMdd')}
          onSubmit={handleSubmitSchedule}
          onCancel={() => { setScheduleModalOpen(false); setEditingSchedule(null); }}
        />
      </StandardModal>

      {/* 업무 보고 등록 다이얼로그 */}
      <StandardModal
        isOpen={isReportModalOpen}
        onClose={() => { setReportModalOpen(false); setEditingReport(null); }}
        title={editingReport ? '업무 보고 수정' : '업무 보고 등록'}
        maxWidth="lg"
      >
        <ReportCreateForm
          // key 로 모드 전환 시 폼을 새로 마운트해 기본값이 확실히 반영되게 한다(일정 폼과 동일).
          key={editingReport?.rptId ?? 'new'}
          mode={editingReport ? 'edit' : 'create'}
          initialData={editingReport ?? undefined}
          defaultYmd={format(new Date(), 'yyyyMMdd')}
          onSubmit={handleSubmitReport}
          onCancel={() => { setReportModalOpen(false); setEditingReport(null); }}
        />
      </StandardModal>
    </div>
  );
}
