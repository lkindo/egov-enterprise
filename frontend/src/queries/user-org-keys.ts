/**
 * 사용자·조직 허브(관리자 > 사용자·조직)의 조회 키. 사용자 목록·사용자 상세·부재 기록·부서 트리가 각자 이름공간을 갖는다.
 * 허브의 쓰기(사용자 저장·잠금 해제·부서 이동·계층 저장·부재 처리)와 결과 툴바의 새로고침, 부재 대리 지정 대화상자가 각 갈래의
 * `all`(또는 고른 사용자의 `detail`)을 무효화한다.
 *
 * 기능을 뺀 생성물에서 연쇄 제거에 걸리지 않게 어떤 모듈도 import 하지 않는다.
 */
export const userOrgKeys = {
  users: {
    // 목록 화면은 이 뿌리 뒤에 검색어·쪽·쪽당 건수·조건·정렬을 배열로 직접 펼친다(쪽당 건수 census 가 화면의 queryKey 배열을 읽는다).
    all: ['admin-users'] as const,
  },
  userDetail: {
    all: ['admin-user-detail'] as const,
    detail: (userId: string | number | null) => [...userOrgKeys.userDetail.all, userId] as const,
  },
  absences: {
    all: ['admin-user-absences'] as const,
  },
  depts: {
    all: ['admin-depts'] as const,
    tree: (keyword: string) => [...userOrgKeys.depts.all, 'tree', keyword] as const,
  },
};
