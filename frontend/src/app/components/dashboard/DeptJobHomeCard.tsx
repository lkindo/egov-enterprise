'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';
import { HomeSummaryCard, summaryValue } from './HomeSummaryCard';

/**
 * 업무 홈의 '내 담당 업무' 카드(core, 2026-10-20). 부서 업무는 core 기능이라 home-sections 기여가 아니라 업무 홈 셸이 직접 그린다 —
 * 나의 업무 탭 줄의 core 탭(업무 관리)과 같은 방식이다. 셸은 이 카드가 부르는 부서 업무 목록 API 의 권한(DEPT_JOB_READ)이 있을 때만
 * 그린다.
 *
 * 원천은 부서 업무 화면(/smart-toolkit/dept-job)의 기본 목록과 같은 조회(scope=mine — 내가 담당자인 업무)이고, 값은 그 전체 건수다.
 * 부서 업무에는 진행·완료 상태가 없어 '처리할' 업무를 따로 가르지 않는다. 첫 쪽의 두 건(서버 순서)의 이름을 덧붙인다.
 */
const MAX_ITEMS = 2;

export function DeptJobHomeCard() {
  const { user } = useAuth();
  const jobs = useQuery({
    queryKey: ['home', 'dept-jobs-mine', user?.id],
    queryFn: () => deptJobUserService.getDeptJobList({ page: 1, size: MAX_ITEMS, scope: 'mine' }),
    retry: false,
  });
  return (
    <HomeSummaryCard
      href="/smart-toolkit/dept-job"
      label="내 담당 업무"
      value={summaryValue(jobs, jobs.data?.total)}
      items={(jobs.data?.list ?? []).slice(0, MAX_ITEMS).map(job => job.deptTaskNm || '이름 없는 업무')}
    />
  );
}
