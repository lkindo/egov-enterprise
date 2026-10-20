'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { todayStorageYmd } from '@/lib/format-date';
import { getDeptScheduleMonthList } from '@/services/business/schedule/deptScheduleService';
import type { DeptSchedule } from '@/types/business/schedule';
import { HomeSummaryCard, summaryValue } from './HomeSummaryCard';

/**
 * 업무 홈의 '오늘 일정' 카드(2026-10-20). 일정 기능 소유이고 업무 홈 셸에는 home-sections 기여(extensions/schedule/home-sections.ts)로
 * 들어간다. 노출은 카드가 부르는 월별 일정 API 의 권한(SCHEDULE_READ)이다.
 *
 * 원천은 일정 화면 달력과 같은 월별 조회(GET /schedules/monthly — 내가 담당자인 일정과 우리 부서 공유 일정)이고, 그 가운데 오늘이 기간
 * 안에 드는 일정을 고른다(시작일 ≤ 오늘 ≤ 종료일, 종료일이 없으면 시작일 하루). 기간 조회(/schedules/range)는 배선하지 않는다 —
 * 그 연산은 제품 결정 대기다(GAP-WIRING-001). 오늘은 달력과 같은 브라우저 날짜다. 목록 순서는 서버의 시작일·등록 순이다.
 */
const MAX_ITEMS = 2;

function coversDay(schedule: DeptSchedule, day: string): boolean {
  const begin = schedule.schdlBgngYmd?.slice(0, 8);
  const end = (schedule.schdlEndYmd || schedule.schdlBgngYmd)?.slice(0, 8);
  return !!begin && !!end && begin <= day && day <= end;
}

export function ScheduleTodayCard() {
  const { user } = useAuth();
  const today = todayStorageYmd();
  const yearMonth = today.slice(0, 6);
  const schedules = useQuery({
    queryKey: ['home', 'schedule-today', user?.id, yearMonth],
    queryFn: () => getDeptScheduleMonthList({ yearMonth }),
    retry: false,
  });
  const todays = (schedules.data ?? []).filter(schedule => coversDay(schedule, today));
  return (
    <HomeSummaryCard
      href="/smart-toolkit/schedule"
      label="오늘 일정"
      value={summaryValue(schedules, schedules.data ? todays.length : null)}
      items={todays.slice(0, MAX_ITEMS).map(schedule => schedule.schdlNm || '제목 없는 일정')}
    />
  );
}
