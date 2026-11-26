/**
 * 부서 업무의 쿼리 키 — 업무 목록과 업무함.
 *
 * 업무 목록은 목록 섹션(DeptJobListSection)이 조회하고, 등록(DeptJobCreateClient·목록 섹션의 등록 대화상자)·상세의 수정·삭제·
 * 담당자 변경(DeptJobDetailClient)·업무함 관리(DeptJobBoxManageDialog)가 뿌리로 무효화한다. 업무함은 업무 폼(DeptJobForm)의
 * 선택지와 업무함 관리 대화상자가 조회하고, 업무함 관리가 뿌리로 무효화한다.
 * 두 뿌리는 서로 다른 캐시라 하나의 `all` 아래로 모으지 않는다 — 뿌리 이름을 바꾸면 이미 쓰는 캐시 키가 달라진다.
 * 다른 모듈을 import 하지 않는다(기능을 뺀 생성물의 연쇄 제거에 걸리지 않게).
 */
export const deptJobKeys = {
  /** 업무 목록 뿌리 — 업무·업무함을 바꾼 뒤 전체를 무효화하는 접두. */
  jobsRoot: ['work-jobs'] as const,
  /** 업무 목록 한 쪽(검색어·쪽·조회 범위·쪽당 건수). */
  jobs: (searchKeyword: string, page: number, scope: string, pageUnit: number) =>
    [...deptJobKeys.jobsRoot, searchKeyword, page, scope, pageUnit] as const,
  /** 업무함 뿌리 — 업무 폼의 업무함 선택지(전체 목록)가 이 키 그대로 조회하고, 업무함을 바꾼 뒤 전체를 무효화한다. */
  boxesRoot: ['dept-job-boxes'] as const,
  /** 업무함 관리 대화상자의 한 쪽. */
  boxesManage: (page: number) => [...deptJobKeys.boxesRoot, 'manage', page] as const,
};
