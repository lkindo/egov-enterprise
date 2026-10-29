'use client';

import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar } from '@/components/ui/calendar';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { ScheduleCreateForm, type ScheduleFormValues } from '@/components/business/schedule/ScheduleCreateForm';
import { useWorkHubTabStrip } from '@/components/business/work-hub/work-hub-tabs';
// sonner 직접 호출은 문자열 정규화 페일세이프가 없어 객체가 들어오면 '[object Object]' 가 노출된다.
import { useToast } from '@/app/components/ui/toast';
import { getDeptScheduleMonthList, createDeptSchedule, updateDeptSchedule, deleteDeptSchedule } from '@/services/business/schedule/deptScheduleService';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import type { DeptSchedule } from '@/types/business/schedule';
import { format } from 'date-fns';
import { scheduleSpanDates } from '@/lib/date/schedule-span';
import { ko } from 'date-fns/locale';
import { failureMessage } from '@/lib/safe-error-log';
import { isConflictError } from '@/lib/query/list-query-defaults';

/**
 * 일정 화면(/smart-toolkit/schedule, 업무 허브 분해 W1).
 *
 * 종전에는 업무 관리·업무 보고·일정 세 라우트가 업무 허브 클라이언트 하나를 탭 상태로 공유했다. 이제 이 화면은 일정 기능 경로에만
 * 있고, 탭 줄은 core 도우미(useWorkHubTabStrip)가 준다. 달력·월 조회·일정 표·일정 모달·삭제·미저장 가드는 분해 전 업무 허브의 일정
 * 부분을 줄 단위로 옮겼다.
 */
interface ScheduleCalendarClientProps {
  /** 서버가 Asia/Seoul 기준으로 계산한 yyyyMMdd. SSR과 첫 클라이언트 렌더가 같은 날짜를 쓴다. */
  initialYmd: string;
}

const ROUTE = '/smart-toolkit/schedule';

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

export default function ScheduleCalendarClient({ initialYmd }: ScheduleCalendarClientProps) {
  const queryClient = useQueryClient();
  const tabs = useWorkHubTabStrip(ROUTE);

  // 표시 기준 월. 월 이동 시 해당 월의 일정을 다시 조회한다.
  const initialDate = parseYmd(initialYmd);
  if (!initialDate) {
    throw new Error(`ScheduleCalendarClient initialYmd는 yyyyMMdd 실재 날짜여야 합니다: ${initialYmd}`);
  }
  const [currentDate, setCurrentDate] = useState(initialDate);
  // 캘린더에서 선택한 날짜(미선택 시 그 달 전체 일정을 목록에 보여준다).
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  // 일정 등록/수정 다이얼로그. 종전에는 '새 업무 생성' 버튼에 onClick 이 없어 등록 경로가 아예 없었고,
  // 등록이 열린 뒤에도 수정·삭제 수단이 없어 한번 만든 일정을 고치거나 지울 수 없었다.
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DeptSchedule | null>(null);
  // 폼의 미저장 여부. 닫기 가드가 이 값만 본다 — 저장 중 차단은 StandardModal 의
  // closeDisabled 가 따로 소유하므로 여기서 pending 을 다시 판정하지 않는다.
  const [scheduleDirty, setScheduleDirty] = useState(false);
  // 진행 중인 동작의 종류와 대상 행을 함께 들고 행별 aria-busy 를 정확히 찍는다.
  const scheduleActionPendingRef = React.useRef(false);
  const [scheduleAction, setScheduleAction] = useState<{ type: 'save' | 'delete'; id?: number } | null>(null);
  const confirm = useConfirm();
  const { toast } = useToast();

  // 모달 닫기. 성공 저장은 이 함수를 직접 부르고(이미 저장했으므로 물어볼 것이 없다),
  // 사용자의 닫기 요청은 아래 가드를 거친다.
  const closeScheduleModal = React.useCallback(() => {
    setScheduleModalOpen(false);
    setEditingSchedule(null);
    setScheduleDirty(false);
  }, []);
  // 미저장 입력을 들고 닫으려 하면 확인을 받는다 — 전용 페이지(DeptJobCreateClient)가 라우터
  // 가드로 받는 것과 같은 보호를, 같은 문구로 모달에도 준다.
  const requestCloseSchedule = useDirtyCloseGuard(scheduleDirty, closeScheduleModal);
  const handleScheduleEditState = React.useCallback((s: { dirty: boolean }) => setScheduleDirty(s.dirty), []);

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
  });
  // /monthly 는 PageResponse 가 아니라 배열을 그대로 반환한다.
  const schedules: DeptSchedule[] = useMemo(() => scheduleData || [], [scheduleData]);

  /** 일정이 하나라도 있는 날짜들 — 캘린더 셀에 마커를 찍는 데 쓴다. */
  const scheduleDates = useMemo(() => {
    // ko 달력은 일요일 시작·6주 고정이다. 선택 가능한 앞뒤 달 칸도 같은 일정 표시를 받는다.
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    start.setDate(1 - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 41);
    return schedules.flatMap((s) => scheduleSpanDates(s.schdlBgngYmd, s.schdlEndYmd, { start, end }));
  }, [schedules, currentDate]);

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
        // [2026-10-18] 창을 열 때 읽은 버전을 함께 보낸다 — 다른 사람이 먼저 고쳤으면 서버가 409 로 거부해 덮어쓰지 않는다.
        await updateDeptSchedule(editingSchedule.schdlSn,
          { ...values, version: editingSchedule.version } as Parameters<typeof updateDeptSchedule>[1]);
        toast('일정이 수정되었습니다.', 'success');
      } else {
        await createDeptSchedule(values as Parameters<typeof createDeptSchedule>[0]);
        toast('일정이 등록되었습니다.', 'success');
      }
      // 저장에 성공했으므로 가드를 거치지 않고 곧장 닫는다(물어볼 미저장 변경이 없다).
      closeScheduleModal();
      // 저장 오류는 ScheduleCreateForm이 필드 귀속/일반 안내를 단독 처리한다.
      // 성공한 경우에만 현재 보고 있는 달의 일정을 다시 불러온다.
      await queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
    } catch (error) {
      // 다른 사람이 먼저 고쳤다(409) — 달력을 다시 읽어 다음 수정이 최신 버전으로 열리게 한다. 안내는 폼이 서버 사유로 보인다.
      if (isConflictError(error)) void queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
      throw error;
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
      toast(failureMessage(error, '일정 삭제 중 오류가 발생했습니다.'), 'error');
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
          {/* [2026-09-08] 'MM.dd (E)' → 'yyyy-MM-dd (E)'. 연도를 감추면 지난 해 일정이
              올해 것으로 읽힌다 — 표기 통일과 함께 그 모호함도 없앤다. */}
          {item.schdlBgngYmd ? format(parseYmd(item.schdlBgngYmd) as Date, 'yyyy-MM-dd (E)', { locale: ko }) : '-'}
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
      // [2026-09-26 DIP B4 P5] 부서 일정은 같은 부서 사람에게 보이지만 고칠 수 있는 사람은 등록자·관리자뿐이다 — 서버 힌트로만 그린다.
      accessor: (item) => (
        <div className="flex justify-end gap-1">
          {item.editable && (
          <Button
            variant="ghost"
            size="sm"
            data-testid="schedule-edit"
            aria-label={`${item.schdlNm || '제목 없음'} 일정 수정`}
            disabled={scheduleAction !== null}
            className="px-3 text-[10px] font-black uppercase"
            onClick={() => { setEditingSchedule(item); setScheduleModalOpen(true); }}
          >
            수정
          </Button>
          )}
          {item.deletable && (
          <Button
            variant="ghost"
            size="sm"
            data-testid="schedule-delete"
            aria-label={`${item.schdlNm || '제목 없음'} 일정 ${scheduleAction?.type === 'delete' && scheduleAction.id === item.schdlSn ? '삭제 중' : '삭제'}`}
            aria-busy={scheduleAction?.type === 'delete' && scheduleAction.id === item.schdlSn || undefined}
            disabled={scheduleAction !== null}
            className="px-3 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500 hover:text-white"
            onClick={() => handleDeleteSchedule(item)}
          >
            삭제
          </Button>
          )}
        </div>
      ),
      className: 'w-40 text-right',
    },
  ];

  return (
    <>
    <WorkListPage
      title="일정"
      description="월간 일정을 조회합니다. 날짜를 선택하면 그 날짜의 일정만 표시합니다."
      breadcrumbItems={[{ label: '나의 업무' }, { label: '일정' }]}
      filterStateKey="work-hub"
      /* 일정은 월 단위 조회라 서버 총계가 없다 — 현재 월 건수임을 툴바 문구가 밝힌다. */
      totalCount={isScheduleError ? undefined : schedules.length}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {tabs.strip}
          <Button
            size="sm"
            disabled={scheduleAction !== null}
            onClick={() => setScheduleModalOpen(true)}
          >
            <Plus size={16} aria-hidden="true" /> 일정 등록
          </Button>
        </div>
      }
      /* 일정은 월 단위 조회라 키워드 검색 대상이 아니다 — 동작하지 않는 입력을 만들지 않는다. */
      toolbarActions={
        /* 지표 카드 3장을 한 줄 요약으로 수렴한다. 일정은 서버 총계가 없어 범위를 문구로 밝힌다. */
        <span className="text-[length:var(--font-size-body)] text-muted-foreground">
          {`${format(currentDate, 'yyyy년 M월', { locale: ko })} 기준`}
        </span>
      }
    >
      {tabs.panel(
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
                outside: 'day-outside text-muted-foreground',
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
        </div>,
      )}
    </WorkListPage>

      {/* 일정 등록 다이얼로그 — 캘린더에서 선택한 날짜가 기본값이 된다. */}
      <StandardModal
        isOpen={isScheduleModalOpen}
        onClose={requestCloseSchedule}
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
          onCancel={requestCloseSchedule}
          onEditStateChange={handleScheduleEditState}
          isPending={scheduleAction?.type === 'save'}
        />
      </StandardModal>
    </>
  );
}
