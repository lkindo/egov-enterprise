import { z } from 'zod';
import {
  CatalogResponseSchema, GroupSummaryResponseSchema, GroupSnapshotResponseSchema,
  MembershipSnapshotResponseSchema, GrantResponseSchema, OperationResponseSchema,
  NavigationResponseSchema, UserChoiceResponseSchema, ChangeResponseSchema,
  PageResponseUserChoiceResponseSchema, PageResponseChangeResponseSchema,
  CreateGroupRequestSchema, ChangeDepartmentGroupsRequestSchema,
  DepartmentChoiceResponseSchema, DepartmentSnapshotResponseSchema, DepartmentMemberResponseSchema,
  GrantMatrixResponseSchema, ChangeGroupMembersRequestSchema, GroupMembersChangeResponseSchema,
  CopyGroupRequestSchema,
} from '@/types/generated-zod';

const identifier = z.string().min(1);
const uniqueStrings = z.array(identifier).refine((values) => new Set(values).size === values.length);
export const grantSchema = GrantResponseSchema.extend({ type: z.enum(['OPERATION', 'NAVIGATION']), code: identifier });
export type AuthorizationGrant = z.infer<typeof grantSchema>;
export function grantKey(grant: AuthorizationGrant): string { return `${grant.type}:${grant.code}`; }
const grantsSchema = z.array(grantSchema).refine((values) => new Set(values.map(grantKey)).size === values.length);

export const authorizationCatalogSchema = CatalogResponseSchema.extend({
  operations: z.array(OperationResponseSchema.extend({ code: identifier, domain: identifier, action: identifier, name: identifier }))
    .refine((values) => new Set(values.map((value) => value.code)).size === values.length),
  navigation: z.array(NavigationResponseSchema.extend({ code: identifier, name: identifier }))
    .refine((values) => new Set(values.map((value) => value.code)).size === values.length),
  catalogVersion: identifier,
});
export const authorizationGroupSummarySchema = GroupSummaryResponseSchema.extend({ code: identifier, name: identifier, version: identifier });
export const authorizationGroupsSchema = z.array(authorizationGroupSummarySchema)
  .refine((values) => new Set(values.map((value) => value.code)).size === values.length);
export const authorizationGroupSnapshotSchema = GroupSnapshotResponseSchema.extend({
  code: identifier, name: identifier, grants: grantsSchema, version: identifier, complete: z.literal(true),
});
export const authorizationMembershipSchema = MembershipSnapshotResponseSchema.extend({
  userId: identifier, groups: uniqueStrings, version: identifier, complete: z.literal(true),
});
export const authorizationDepartmentsSchema = z.array(DepartmentChoiceResponseSchema.extend({ id: identifier, name: identifier }))
  .refine((values) => new Set(values.map((value) => value.id)).size === values.length);
export const authorizationDepartmentSnapshotSchema = DepartmentSnapshotResponseSchema.extend({
  departmentId: identifier, version: identifier, complete: z.literal(true),
  users: z.array(DepartmentMemberResponseSchema.extend({ userId: identifier, groups: uniqueStrings, version: identifier, complete: z.literal(true) }))
    .refine((values) => new Set(values.map((value) => value.userId)).size === values.length),
});
export type AuthorizationDepartmentSnapshot = z.infer<typeof authorizationDepartmentSnapshotSchema>;
/** 사용자 선택지(id = esntlId, userId = 로그인 ID). 사용자 검색·그룹 구성원·구성원 일괄 변경 응답이 같은 모양이다. */
export const authorizationUserChoiceSchema = UserChoiceResponseSchema.extend({ id: identifier, userId: identifier, userNm: identifier });
export type AuthorizationUserChoice = z.infer<typeof authorizationUserChoiceSchema>;
export const authorizationUsersPageSchema = PageResponseUserChoiceResponseSchema.extend({
  list: z.array(authorizationUserChoiceSchema),
  total: z.number().int().nonnegative(), page: z.number().int().positive(),
  size: z.number().int().positive(), totalPage: z.number().int().nonnegative(),
});
export const authorizationHistoryPageSchema = PageResponseChangeResponseSchema.extend({
  list: z.array(ChangeResponseSchema.extend({ id: z.number(), targetType: identifier, changeType: identifier, createdAt: identifier })),
  total: z.number().int().nonnegative(), page: z.number().int().positive(),
  size: z.number().int().positive(), totalPage: z.number().int().nonnegative(),
});
/**
 * 그룹 코드 규칙 — 서버 CreateGroup·CopyGroup 의 @Pattern("[A-Z][A-Z0-9_]{0,19}")과 같다. Java @Pattern 은 전체 일치인데
 * 생성 zod 의 정규식은 앞뒤 고정이 없는 부분 일치라 'aBC'·'CONTENT-X' 를 통과시키고(서버가 400), 대문자가 없는 값에는
 * 영어 기본 문구를 첫 오류로 낸다. 그래서 생성 검사를 잇지 않고 앞뒤를 고정한 같은 규칙을 한국어 문구로 둔다.
 * 생성 계약과 규칙이 같다는 것은 계약 테스트가 대조한다(생성 정규식이 바뀌면 red).
 */
export const GROUP_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,19}$/;
const groupCodeSchema = z.string()
  .min(1, '그룹 코드를 입력하세요.')
  .max(20, '그룹 코드는 20자까지 쓸 수 있습니다.')
  .regex(GROUP_CODE_PATTERN, '그룹 코드는 영문 대문자로 시작하고 영문 대문자·숫자·밑줄(_)만 쓸 수 있습니다.');
export const authorizationGroupFormSchema = CreateGroupRequestSchema.extend({
  code: groupCodeSchema,
  name: CreateGroupRequestSchema.shape.name.trim().min(1, '그룹명을 입력하세요.'),
  description: CreateGroupRequestSchema.shape.description.unwrap().unwrap(),
});
export type AuthorizationCatalog = z.infer<typeof authorizationCatalogSchema>;
export type AuthorizationGroupSummary = z.infer<typeof authorizationGroupSummarySchema>;
export type AuthorizationGroupSnapshot = z.infer<typeof authorizationGroupSnapshotSchema>;
export type AuthorizationMembership = z.infer<typeof authorizationMembershipSchema>;
export type AuthorizationGroupFormValues = z.infer<typeof authorizationGroupFormSchema>;
export const authorizationDepartmentChangeSchema = ChangeDepartmentGroupsRequestSchema.extend({
  userIds: ChangeDepartmentGroupsRequestSchema.shape.userIds.min(1, '대상 사용자를 선택하세요.'),
  groupCode: ChangeDepartmentGroupsRequestSchema.shape.groupCode.min(1, '권한 그룹을 선택하세요.'),
  action: z.enum(['ADD', 'REMOVE']),
  version: ChangeDepartmentGroupsRequestSchema.shape.version.min(1), complete: z.literal(true),
});

/**
 * [2026-10-02 D6] 그룹 쪽 구성원 일괄 추가·회수 요청(PATCH .../groups/{code}/members, authzChangeGroupMembers).
 *
 * 값은 사용자 고유 식별자(esntlId)다. 버전은 없다 — 서버가 '추가 대상은 지금 비구성원, 회수 대상은 지금 구성원' 을
 * 전제로 동시성을 보고, 어긋난 사람을 이름으로 밝혀 409 로 거부한다(그룹 버전은 구성원 변경으로 바뀌지 않는다).
 * 아래 규칙은 전송 전에 막을 뿐이고, 서버가 같은 규칙을 다시 집행한다.
 *   · 빈 요청·중복·추가와 회수의 겹침·미완료 요청은 서버 400 과 같은 문구다.
 *   · 빈 식별자(공백만 포함 — 서버 @NotBlank·isBlank 와 같다)와 상한(목록마다 500명, 식별자 20자 — 서버 @Size)은 같은 규칙에
 *     화면 안내 문구를 단다. 생성 계약의 상한 검사는 영어 기본 문구를 내므로 잇지 않고, 상한 값이 생성 계약과 같다는 것은
 *     계약 테스트가 대조한다.
 */
export const GROUP_MEMBERS_LIST_MAX = 500;
const GROUP_MEMBER_ID_MAX = 20;
const memberIdList = z.array(
  z.string()
    .max(GROUP_MEMBER_ID_MAX, '사용자를 다시 선택해 주세요.')
    .refine((id) => id.trim().length > 0, '사용자를 다시 선택해 주세요.'),
).max(GROUP_MEMBERS_LIST_MAX, `한 번에 추가하거나 회수할 수 있는 사용자는 각각 ${GROUP_MEMBERS_LIST_MAX}명까지입니다.`);
export const authorizationGroupMembersRequestSchema = ChangeGroupMembersRequestSchema.extend({
  add: memberIdList,
  remove: memberIdList,
  complete: z.literal(true, { error: '구성원 목록을 다시 조회한 뒤 저장해 주세요.' }),
})
  .refine((value) => value.add.length + value.remove.length > 0, '추가하거나 회수할 사용자를 선택해 주세요.')
  .refine((value) => new Set(value.add).size === value.add.length && new Set(value.remove).size === value.remove.length, '중복된 사용자입니다.')
  .refine((value) => !value.add.some((id) => value.remove.includes(id)), '같은 사용자를 추가와 회수에 함께 지정할 수 없습니다.');
export type AuthorizationGroupMembersRequest = z.infer<typeof authorizationGroupMembersRequestSchema>;

/** 구성원 일괄 변경 결과. added·removed 는 실제로 바뀐 사람(esntlId 순), memberCount 는 저장 뒤 구성원 수다. */
export const authorizationGroupMembersChangeSchema = GroupMembersChangeResponseSchema.extend({
  code: identifier,
  added: z.array(authorizationUserChoiceSchema),
  removed: z.array(authorizationUserChoiceSchema),
  memberCount: z.number().int().nonnegative(),
});
export type AuthorizationGroupMembersChange = z.infer<typeof authorizationGroupMembersChangeSchema>;

/**
 * [2026-10-02 D1·D4] 모든 그룹의 전체 권한(GET .../grants, authzGrantMatrix). 그룹마다 저장 기준선과 같은 완결 스냅샷이다
 * — 메뉴 편집기의 '보이는 그룹'·그룹 배정 저장(groupVersion), 사용자 메뉴 미리보기(그 사용자 그룹의 합집합)가 읽는다.
 */
export const authorizationGrantMatrixSchema = GrantMatrixResponseSchema.extend({
  catalogVersion: identifier,
  groups: z.array(authorizationGroupSnapshotSchema)
    .refine((values) => new Set(values.map((value) => value.code)).size === values.length),
});
export type AuthorizationGrantMatrix = z.infer<typeof authorizationGrantMatrixSchema>;

/**
 * [2026-10-02 A6] 그룹 복제 양식(POST .../groups/{code}/copies, authzCopyGroup). 코드·이름·설명 규칙은 그룹 등록 양식과
 * 같다. sourceVersion 은 원본 그룹 스냅샷의 version 이다 — 그 사이 원본이 바뀌었으면 서버가 409 로 거부한다.
 * 구성원은 복사하지 않는다(서버 계약).
 */
export const authorizationGroupCopyFormSchema = CopyGroupRequestSchema.extend({
  code: authorizationGroupFormSchema.shape.code,
  name: authorizationGroupFormSchema.shape.name,
  description: authorizationGroupFormSchema.shape.description,
  sourceVersion: CopyGroupRequestSchema.shape.sourceVersion.min(1, '원본 그룹을 다시 조회해 주세요.'),
});
export type AuthorizationGroupCopyValues = z.infer<typeof authorizationGroupCopyFormSchema>;

/**
 * 두 권한 목록이 같은 집합인가(순서 무관). 기본 정보 저장 응답의 grants 가 권한 초안 기준선과 같을 때만 그 version 을
 * 권한 초안이 이어받는다(A2) — 다르면 다른 곳에서 권한이 바뀐 것이므로 이어받지 않는다.
 */
export function sameGrantSet(left: readonly AuthorizationGrant[], right: readonly AuthorizationGrant[]): boolean {
  const keys = new Set(left.map(grantKey));
  return keys.size === new Set(right.map(grantKey)).size && right.every((grant) => keys.has(grantKey(grant)));
}

/** Search filters are never assignment baselines. Unknown selections must not disappear on PUT. */
export function hasCompleteCatalog(snapshot: AuthorizationGroupSnapshot, catalog: AuthorizationCatalog): boolean {
  const keys = new Set([
    ...catalog.operations.map((operation) => `OPERATION:${operation.code}`),
    ...catalog.navigation.map((navigation) => `NAVIGATION:${navigation.code}`),
  ]);
  return snapshot.complete === true && snapshot.version.length > 0 && snapshot.grants.every((grant) => keys.has(grantKey(grant)));
}

export function selectedGrants(keys: ReadonlySet<string>, catalog: AuthorizationCatalog): AuthorizationGrant[] {
  return [
    ...catalog.operations.map((operation) => ({ type: 'OPERATION' as const, code: operation.code })),
    ...catalog.navigation.map((navigation) => ({ type: 'NAVIGATION' as const, code: navigation.code })),
  ].filter((grant) => keys.has(grantKey(grant)));
}
