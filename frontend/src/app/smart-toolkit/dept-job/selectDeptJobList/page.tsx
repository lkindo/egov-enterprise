import { redirect } from 'next/navigation';

/**
 * 레거시 경로. 부서 업무 목록의 정본은 업무 워크플로우 화면(/smart-toolkit/dept-job)이다.
 *
 * 종전 구현(DeptJobListClient)은 존재하지 않는 `/api/v1/deptjob` 를 호출하는 파손 목록이었고,
 * 행 클릭은 등록 폼 복제본(selectDeptJobDetail/[id])으로 보냈다.
 *
 * 파일을 삭제하지 않고 redirect 로 남기는 이유: Next 라우트는 문자열 URL 로만 참조되므로
 * import 분석으로는 미사용 여부를 판정할 수 없다(2026-07-11 에 그 오판으로 라우트 13개를
 * 삭제했다가 런타임 404 를 낸 전례가 있다). 기존 북마크·딥링크도 정본으로 흘려보낸다.
 */
export default function Page() {
    redirect('/smart-toolkit/dept-job');
}
