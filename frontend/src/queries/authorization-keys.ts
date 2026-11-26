/**
 * 권한 관리(권한 그룹 허브·부서별 그룹 배정·유효권한)의 조회 키. 모든 키는 보는 사람의 범위 `scope(사용자 ID, 권한 버전)` 아래에
 * 종류('groups'·'catalog'·'membership' …)를 붙인다 — 넷째 자리가 종류라는 것을 구성원 변경 뒤 무효화(group-member-queries 의
 * predicate)가 기댄다. 새로 조회·쓰기 뒤에는 `all` 을 무효화한다.
 *
 * 기능을 뺀 생성물에서 연쇄 제거에 걸리지 않게 어떤 모듈도 import 하지 않는다.
 */
export const authorizationKeys = {
  all: ['authorization'] as const,
  scope: (userId: string | undefined, authorizationVersion: string | undefined) =>
    [...authorizationKeys.all, userId, authorizationVersion] as const,
  effectiveGroups: (
    userId: string | undefined,
    authorizationVersion: string | undefined,
    targetUserId: string,
    targetVersion: string,
  ) => [...authorizationKeys.scope(userId, authorizationVersion), 'effective-groups', targetUserId, targetVersion] as const,
};
