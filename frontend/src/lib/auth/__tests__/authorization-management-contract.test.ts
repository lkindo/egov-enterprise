import { describe, expect, it } from 'vitest';
import {
  authorizationCatalogSchema, authorizationGroupSnapshotSchema, authorizationMembershipSchema,
  authorizationGroupFormSchema, hasCompleteCatalog, selectedGrants,
} from '../authorization-management-contract';

const catalog = {
  operations: [{ code: 'BOARD_READ', domain: 'BOARD', action: 'READ', name: '게시글 조회' }, { code: 'BOARD_CREATE', domain: 'BOARD', action: 'CREATE', name: '게시글 등록' }],
  navigation: [{ code: 'MENU_1', name: '게시판', parentCode: null }], catalogVersion: 'c1',
};
const snapshot = { code: 'CONTENT', name: '콘텐츠 담당', description: null, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }], version: 'v1', complete: true };

describe('authorization management complete snapshots', () => {
  it('전체 목록·고유 선택과 version을 확인한 응답을 허용한다', () => {
    const completeCatalog = authorizationCatalogSchema.parse(catalog);
    const completeSnapshot = authorizationGroupSnapshotSchema.parse(snapshot);
    expect(hasCompleteCatalog(completeSnapshot, completeCatalog)).toBe(true);
    expect(selectedGrants(new Set(['OPERATION:BOARD_CREATE', 'NAVIGATION:MENU_1']), completeCatalog)).toEqual([
      { type: 'OPERATION', code: 'BOARD_CREATE' }, { type: 'NAVIGATION', code: 'MENU_1' },
    ]);
  });
  it.each([
    { ...snapshot, complete: false }, { ...snapshot, complete: undefined },
    { ...snapshot, version: '' }, { ...snapshot, grants: undefined },
    { ...snapshot, grants: [...snapshot.grants, ...snapshot.grants] },
    { ...snapshot, grants: [{ type: 'LEGACY_ROLE', code: 'ROLE_ADMIN' }] },
  ])('부분·중복·잘못된 구분 응답을 저장 기준선으로 허용하지 않는다 %#', (value) => {
    expect(authorizationGroupSnapshotSchema.safeParse(value).success).toBe(false);
  });
  it('미등록 권한을 가진 기준선은 삭제된 것처럼 저장하지 않는다', () => {
    const value = authorizationGroupSnapshotSchema.parse({ ...snapshot, grants: [{ type: 'OPERATION', code: 'UNKNOWN' }] });
    expect(hasCompleteCatalog(value, authorizationCatalogSchema.parse(catalog))).toBe(false);
  });
  it('카탈로그의 중복 코드는 거부한다', () => {
    expect(authorizationCatalogSchema.safeParse({ ...catalog, operations: [...catalog.operations, catalog.operations[0]] }).success).toBe(false);
  });
  it.each([
    { userId: 'ESNTL_A', groups: ['CONTENT'], version: 'v1', complete: false },
    { userId: 'ESNTL_A', groups: ['CONTENT', 'CONTENT'], version: 'v1', complete: true },
    { userId: 'ESNTL_A', groups: ['CONTENT'], version: '', complete: true },
  ])('부분·중복·version 없는 사용자 배정을 거부한다 %#', (value) => {
    expect(authorizationMembershipSchema.safeParse(value).success).toBe(false);
  });
  it('사용자의 전체 그룹이 0개인 명시적 회수를 허용한다', () => {
    expect(authorizationMembershipSchema.parse({ userId: 'ESNTL_A', groups: [], version: 'v1', complete: true }).groups).toEqual([]);
  });
  it('그룹 코드와 필수 이름을 생성 계약에서 검증한다', () => {
    expect(authorizationGroupFormSchema.safeParse({ code: 'CONTENT', name: '콘텐츠 운영', description: '' }).success).toBe(true);
    expect(authorizationGroupFormSchema.safeParse({ code: 'content', name: ' ', description: '' }).success).toBe(false);
  });
});
