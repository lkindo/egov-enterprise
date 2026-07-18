import { redirect } from 'next/navigation';

// 샘플 통합 허브(WorkHubClient: 일정/보고/캘린더 탭 포함)는 재사용 base 에서 제거됐다.
// 부서 직무(deptjob)는 유지 도메인이므로, 실제 목록 라우트로 리다이렉트한다.
export default function DeptJobPage() {
  redirect('/smart-toolkit/dept-job/selectDeptJobList');
}
