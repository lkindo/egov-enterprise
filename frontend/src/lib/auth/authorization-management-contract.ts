import { z } from 'zod';
import {
  CatalogResponseSchema, GroupSummaryResponseSchema, GroupSnapshotResponseSchema,
  MembershipSnapshotResponseSchema, GrantResponseSchema, OperationResponseSchema,
  NavigationResponseSchema, UserChoiceResponseSchema, ChangeResponseSchema,
  PageResponseUserChoiceResponseSchema, PageResponseChangeResponseSchema,
  CreateGroupRequestSchema, ChangeDepartmentGroupsRequestSchema,
  DepartmentChoiceResponseSchema, DepartmentSnapshotResponseSchema, DepartmentMemberResponseSchema,
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
export const authorizationUsersPageSchema = PageResponseUserChoiceResponseSchema.extend({
  list: z.array(UserChoiceResponseSchema.extend({ id: identifier, userId: identifier, userNm: identifier })),
  total: z.number().int().nonnegative(), page: z.number().int().positive(),
  size: z.number().int().positive(), totalPage: z.number().int().nonnegative(),
});
export const authorizationHistoryPageSchema = PageResponseChangeResponseSchema.extend({
  list: z.array(ChangeResponseSchema.extend({ id: z.number(), targetType: identifier, changeType: identifier, createdAt: identifier })),
  total: z.number().int().nonnegative(), page: z.number().int().positive(),
  size: z.number().int().positive(), totalPage: z.number().int().nonnegative(),
});
export const authorizationGroupFormSchema = CreateGroupRequestSchema.extend({
  code: CreateGroupRequestSchema.shape.code.min(1, '그룹 코드를 입력하세요.'),
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
