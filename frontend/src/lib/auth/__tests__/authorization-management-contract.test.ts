import { describe, expect, it } from 'vitest';
import {
  authorizationCatalogSchema, authorizationGroupSnapshotSchema, authorizationMembershipSchema,
  authorizationGroupFormSchema, hasCompleteCatalog, selectedGrants,
  authorizationGrantMatrixSchema, authorizationGroupMembersRequestSchema, authorizationGroupMembersChangeSchema,
  authorizationGroupCopyFormSchema, sameGrantSet, type AuthorizationGrant,
  GROUP_CODE_PATTERN, GROUP_MEMBERS_LIST_MAX,
} from '../authorization-management-contract';
import { ChangeGroupMembersRequestSchema, CopyGroupRequestSchema, CreateGroupRequestSchema } from '@/types/generated-zod';

// [2026-10-02] 카탈로그의 메뉴 항목은 사용 여부(useYn, 'Y'|'N')를 싣는다(서버 계약 — NULL·그 밖의 값은 'N').
const catalog = {
  operations: [{ code: 'BOARD_READ', domain: 'BOARD', action: 'READ', name: '게시글 조회' }, { code: 'BOARD_CREATE', domain: 'BOARD', action: 'CREATE', name: '게시글 등록' }],
  navigation: [{ code: 'MENU_1', name: '게시판', parentCode: null, route: null, useYn: 'Y' }], catalogVersion: 'c1',
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
  it('카탈로그의 메뉴 사용 여부는 Y·N 만 받는다', () => {
    expect(authorizationCatalogSchema.safeParse({ ...catalog, navigation: [{ ...catalog.navigation[0], useYn: 'N' }] }).success).toBe(true);
    expect(authorizationCatalogSchema.safeParse({ ...catalog, navigation: [{ ...catalog.navigation[0], useYn: undefined }] }).success).toBe(false);
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

/** [2026-10-02 D1·D4·D6·A6] 2단계 계약 — 전체 그룹 권한, 그룹 쪽 구성원 일괄 변경, 그룹 복제, 기준선 이어받기. */
describe('authorization management — 2단계 계약', () => {
  it('전체 그룹 권한은 그룹마다 완결 스냅샷이고 그룹 코드가 겹치면 거부한다', () => {
    const matrix = { catalogVersion: 'c1', groups: [snapshot, { ...snapshot, code: 'SURVEY', name: '설문 담당' }] };
    expect(authorizationGrantMatrixSchema.parse(matrix).groups.map((group) => group.code)).toEqual(['CONTENT', 'SURVEY']);
    expect(authorizationGrantMatrixSchema.safeParse({ ...matrix, groups: [snapshot, snapshot] }).success).toBe(false);
    expect(authorizationGrantMatrixSchema.safeParse({ ...matrix, groups: [{ ...snapshot, complete: false }] }).success).toBe(false);
    expect(authorizationGrantMatrixSchema.safeParse({ ...matrix, catalogVersion: '' }).success).toBe(false);
  });

  it('구성원 일괄 변경 요청은 서버 400 과 같은 문구로 전송 전에 막는다', () => {
    const message = (value: unknown) => {
      const result = authorizationGroupMembersRequestSchema.safeParse(value);
      return result.success ? null : result.error.issues[0]?.message;
    };
    expect(message({ add: ['E1'], remove: ['E2'], complete: true })).toBeNull();
    expect(message({ add: [], remove: [], complete: true })).toBe('추가하거나 회수할 사용자를 선택해 주세요.');
    expect(message({ add: ['E1', 'E1'], remove: [], complete: true })).toBe('중복된 사용자입니다.');
    expect(message({ add: [], remove: ['E2', 'E2'], complete: true })).toBe('중복된 사용자입니다.');
    expect(message({ add: ['E1'], remove: ['E1'], complete: true })).toBe('같은 사용자를 추가와 회수에 함께 지정할 수 없습니다.');
    expect(message({ add: [''], remove: [], complete: true })).toBe('사용자를 다시 선택해 주세요.');
    // 서버 @NotBlank·isBlank 와 같이 공백만 있는 식별자도 빈 값이다.
    expect(message({ add: [], remove: ['  '], complete: true })).toBe('사용자를 다시 선택해 주세요.');
    // 미완료 요청은 서버 400 문구(AuthorizationAdministrationService#changeGroupMembers)와 같다.
    expect(message({ add: ['E1'], remove: [], complete: false })).toBe('구성원 목록을 다시 조회한 뒤 저장해 주세요.');
    // 서버 상한(목록마다 500명, 식별자 20자)은 영어 기본 문구가 아니라 한국어 안내로 막는다(부서 탭에서 한꺼번에 고를 때).
    const users = (count: number) => Array.from({ length: count }, (_, index) => `E${index}`);
    expect(message({ add: users(500), remove: users(500).map((id) => `R${id}`), complete: true })).toBeNull();
    expect(message({ add: users(501), remove: [], complete: true })).toBe('한 번에 추가하거나 회수할 수 있는 사용자는 각각 500명까지입니다.');
    expect(message({ add: [], remove: users(501), complete: true })).toBe('한 번에 추가하거나 회수할 수 있는 사용자는 각각 500명까지입니다.');
    expect(message({ add: ['E'.repeat(20)], remove: [], complete: true })).toBeNull();
    expect(message({ add: ['E'.repeat(21)], remove: [], complete: true })).toBe('사용자를 다시 선택해 주세요.');
  });

  it('구성원 요청의 상한은 생성 계약(서버 @Size)과 같다 — 생성 계약이 바뀌면 이 계약도 함께 바꾼다', () => {
    for (const list of [ChangeGroupMembersRequestSchema.shape.add, ChangeGroupMembersRequestSchema.shape.remove]) {
      expect((list._zod.bag as { maximum?: number }).maximum).toBe(GROUP_MEMBERS_LIST_MAX);
      expect(list.element.maxLength).toBe(20);
    }
  });

  it('구성원 일괄 변경 결과는 바뀐 사람과 저장 뒤 구성원 수다', () => {
    const user = { id: 'E1', userId: 'kim', userNm: '김', departmentId: null };
    expect(authorizationGroupMembersChangeSchema.parse({ code: 'CONTENT', added: [user], removed: [], memberCount: 3 }).added).toEqual([user]);
    expect(authorizationGroupMembersChangeSchema.safeParse({ code: 'CONTENT', added: [{ ...user, id: '' }], removed: [], memberCount: 3 }).success).toBe(false);
    expect(authorizationGroupMembersChangeSchema.safeParse({ code: 'CONTENT', added: [], removed: [], memberCount: -1 }).success).toBe(false);
  });

  it('그룹 복제 양식은 그룹 등록 양식과 같은 규칙에 원본 version 을 요구한다', () => {
    const values = { code: 'CONTENT_COPY', name: '콘텐츠 운영 사본', description: '', sourceVersion: 'v1' };
    expect(authorizationGroupCopyFormSchema.safeParse(values).success).toBe(true);
    expect(authorizationGroupCopyFormSchema.safeParse({ ...values, sourceVersion: '' }).success).toBe(false);
    expect(authorizationGroupCopyFormSchema.safeParse({ ...values, name: ' ' }).success).toBe(false);
    expect(authorizationGroupCopyFormSchema.safeParse({ ...values, code: 'content' }).success).toBe(false);
    expect(authorizationGroupCopyFormSchema.safeParse({ ...values, extra: 1 }).data).not.toHaveProperty('extra');
  });

  it('그룹 코드는 서버 @Pattern 처럼 전체가 규칙에 맞아야 하고, 첫 오류는 한국어 안내다(등록·복제 양식 공통)', () => {
    const codeMessage = (schema: typeof authorizationGroupFormSchema | typeof authorizationGroupCopyFormSchema, code: string) => {
      const result = schema.safeParse({ code, name: '그룹', description: '', sourceVersion: 'v1' });
      return result.success ? null : result.error.issues.find((issue) => issue.path[0] === 'code')?.message ?? null;
    };
    const pattern = '그룹 코드는 영문 대문자로 시작하고 영문 대문자·숫자·밑줄(_)만 쓸 수 있습니다.';
    for (const schema of [authorizationGroupFormSchema, authorizationGroupCopyFormSchema]) {
      expect(codeMessage(schema, 'CONTENT_2')).toBeNull();
      expect(codeMessage(schema, 'A'.repeat(20))).toBeNull();
      expect(codeMessage(schema, '')).toBe('그룹 코드를 입력하세요.');
      // 생성 정규식(부분 일치)은 이 셋을 통과시키거나(aBC·CONTENT-X) 영어 문구를 냈다(content).
      expect(codeMessage(schema, 'aBC')).toBe(pattern);
      expect(codeMessage(schema, 'CONTENT-X')).toBe(pattern);
      expect(codeMessage(schema, 'content')).toBe(pattern);
      expect(codeMessage(schema, '1ABC')).toBe(pattern);
      expect(codeMessage(schema, 'A'.repeat(21))).toBe('그룹 코드는 20자까지 쓸 수 있습니다.');
    }
  });

  it('그룹 코드 규칙은 생성 계약의 규칙을 앞뒤 고정한 것이다 — 생성 계약이 바뀌면 이 계약도 함께 바꾼다', () => {
    for (const generated of [CreateGroupRequestSchema.shape.code, CopyGroupRequestSchema.shape.code]) {
      const patterns = [...((generated._zod.bag as { patterns?: Set<RegExp> }).patterns ?? [])].map((value) => value.source);
      expect(patterns.map((source) => `^${source}$`)).toEqual([GROUP_CODE_PATTERN.source]);
      expect(generated.maxLength).toBe(20);
    }
  });

  it('권한 목록은 순서와 무관하게 같은 집합인지 비교한다(기준선 이어받기)', () => {
    const a: AuthorizationGrant[] = [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'NAVIGATION', code: '1' }];
    expect(sameGrantSet(a, [...a].reverse())).toBe(true);
    expect(sameGrantSet(a, [a[0]])).toBe(false);
    expect(sameGrantSet(a, [a[0], { type: 'OPERATION', code: '1' }])).toBe(false);
    expect(sameGrantSet([], [])).toBe(true);
  });
});
