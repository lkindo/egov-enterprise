import { redirect } from 'next/navigation';

// 샘플 통합 허브(WorkHubClient: 일정/보고/캘린더 탭)는 재사용 base 에서 제거됐다.
// 워크스페이스 상위 내비게이션 앵커(/admin/work-hub)는 보존하되, 유지 도메인인 부서 직무(deptjob)
// 목록으로 리다이렉트한다. (일정/보고/캘린더 탭은 샘플 도메인이라 함께 제거됨)
export default function WorkHubPage() {
  redirect('/smart-toolkit/dept-job/selectDeptJobList');
}
