import type { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import {
  authzCatalogOperation, authzGroupsOperation, authzGroupOperation,
  authzCreateGroupOperation, authzUpdateGroupOperation, authzDeleteGroupOperation,
  authzReplaceGrantsOperation, authzMembershipsOperation, authzReplaceMembershipsOperation,
  authzUsersOperation, authzHistoryOperation, authzGroupMembersOperation,
  authzDepartmentsOperation, authzDepartmentMembershipsOperation, authzUpdateDepartmentMembershipsOperation,
  authzGrantMatrixOperation, authzChangeGroupMembersOperation, authzCopyGroupOperation,
} from '@/types/generated-operations';
import {
  authorizationCatalogSchema, authorizationGroupsSchema, authorizationGroupSnapshotSchema,
  authorizationMembershipSchema, authorizationUsersPageSchema, authorizationHistoryPageSchema,
  authorizationDepartmentsSchema, authorizationDepartmentSnapshotSchema,
  authorizationGrantMatrixSchema, authorizationGroupMembersRequestSchema, authorizationGroupMembersChangeSchema,
  type AuthorizationGrant, type AuthorizationGroupFormValues, type AuthorizationGroupSnapshot,
  type AuthorizationGrantMatrix, type AuthorizationGroupMembersChange, type AuthorizationGroupMembersRequest,
  type AuthorizationGroupCopyValues,
} from '@/lib/auth/authorization-management-contract';

export interface AuthorizationHistoryFilters {
  groupCode?: string; userId?: string; actorId?: string; fromDate?: string; toDate?: string;
}

/**
 * 쓰기 응답의 그룹 스냅샷을 저장 기준선으로 쓸 수 있는지 확인한다(2026-10-02 S2 — 그룹 생성·수정·권한 저장·복제는
 * 저장 뒤 스냅샷을 돌려준다). 부분·중복 응답이나 다른 그룹의 응답은 기준선으로 쓰지 않는다.
 */
function requireGroupSnapshot(value: unknown, code: string, verb: string): AuthorizationGroupSnapshot {
  const snapshot = authorizationGroupSnapshotSchema.parse(value);
  if (snapshot.code !== code) throw new Error(`${verb} 그룹이 요청한 그룹과 일치하지 않습니다.`);
  return snapshot;
}

class AuthorizationAdminService extends ApiService {
  async getCatalog(config?: AxiosRequestConfig) {
    return authorizationCatalogSchema.parse(await this.executeGenerated(authzCatalogOperation, { config }));
  }
  async getGroups(config?: AxiosRequestConfig) {
    return authorizationGroupsSchema.parse(await this.executeGenerated(authzGroupsOperation, { config }));
  }
  async getGroup(code: string) {
    const value = authorizationGroupSnapshotSchema.parse(await this.executeGenerated(authzGroupOperation, { path: { code } }));
    if (value.code !== code) throw new Error('조회한 그룹이 요청한 그룹과 일치하지 않습니다.');
    return value;
  }
  /**
   * [2026-10-02 D1·D4] 모든 그룹의 전체 권한(AUTHRT_READ). 그룹마다 완결 스냅샷(version 포함)이다 — 메뉴 편집기의 그룹 배정
   * 저장은 여기의 version 을 groupVersion 으로 보낸다.
   */
  async getGrantMatrix(config?: AxiosRequestConfig): Promise<AuthorizationGrantMatrix> {
    return authorizationGrantMatrixSchema.parse(await this.executeGenerated(authzGrantMatrixOperation, { config }));
  }
  /** 그룹 등록. 저장 뒤 새 그룹의 스냅샷(기준선)을 돌려준다. */
  async createGroup(body: AuthorizationGroupFormValues): Promise<AuthorizationGroupSnapshot> {
    return requireGroupSnapshot(await this.executeGenerated(authzCreateGroupOperation, { body }), body.code, '등록한');
  }
  /** 그룹 기본 정보 수정. 저장 뒤 스냅샷을 돌려준다 — 그 grants 가 권한 초안 기준선과 같으면 version 을 이어받을 수 있다. */
  async updateGroup(code: string, body: { name: string; description: string; version: string }): Promise<AuthorizationGroupSnapshot> {
    return requireGroupSnapshot(await this.executeGenerated(authzUpdateGroupOperation, { path: { code }, body }), code, '저장한');
  }
  deleteGroup(code: string, version: string) {
    if (!version) throw new Error('전체 그룹 정보를 다시 조회해 주세요.');
    return this.executeGenerated(authzDeleteGroupOperation, { path: { code }, query: { version } });
  }
  /**
   * 그룹 전체 권한 교체. 빈 version·미완료 요청은 전송 전에(동기로) 막는다. 저장 뒤 스냅샷을 돌려준다 — 그 name·description 이
   * 기본 정보 폼 기준선과 같으면 폼이 version 을 이어받을 수 있다.
   */
  saveGroupGrants(code: string, body: { grants: AuthorizationGrant[]; version: string; complete: true }): Promise<AuthorizationGroupSnapshot> {
    if (!body.version || body.complete !== true) throw new Error('전체 권한을 다시 조회해 주세요.');
    return this.executeGenerated(authzReplaceGrantsOperation, { path: { code }, body })
      .then((value) => requireGroupSnapshot(value, code, '저장한'));
  }
  /**
   * [2026-10-02 A6] 그룹 복제(AUTHRT_CREATE + 서비스가 AUTHRT_GRANT 도 요구, 원본에 보호 권한이 있으면 AUTHRT_ASSIGN 도).
   * 원본(source)의 권한을 새 그룹(body.code)으로 복사하고 구성원은 복사하지 않는다. sourceVersion 이 비면 전송 전에 막는다.
   * 새 그룹의 스냅샷을 돌려준다.
   */
  createGroupCopy(source: string, body: AuthorizationGroupCopyValues): Promise<AuthorizationGroupSnapshot> {
    if (!body.sourceVersion) throw new Error('원본 그룹을 다시 조회해 주세요.');
    return this.executeGenerated(authzCopyGroupOperation, { path: { code: source }, body })
      .then((value) => requireGroupSnapshot(value, body.code, '복제한'));
  }
  async getMemberships(userId: string) {
    const value = authorizationMembershipSchema.parse(await this.executeGenerated(authzMembershipsOperation, { path: { userId } }));
    if (value.userId !== userId) throw new Error('조회한 사용자가 요청한 사용자와 일치하지 않습니다.');
    return value;
  }
  saveUserGroups(userId: string, body: { groups: string[]; version: string; complete: true }) {
    if (!body.version || body.complete !== true) throw new Error('사용자의 전체 그룹을 다시 조회해 주세요.');
    return this.executeGenerated(authzReplaceMembershipsOperation, { path: { userId }, body });
  }
  async getUsers(keyword: string, page: number, size = 20) {
    return authorizationUsersPageSchema.parse(await this.executeGenerated(authzUsersOperation, { query: { keyword, page, size } }));
  }
  /** 그룹에 배정된 사용자(서버 페이지, 이름 순). */
  async getGroupMembers(code: string, page: number, size = 20) {
    return authorizationUsersPageSchema.parse(await this.executeGenerated(authzGroupMembersOperation, { path: { code }, query: { page, size } }));
  }
  /**
   * [2026-10-02 D6] 그룹 쪽 구성원 일괄 추가·회수(AUTHRT_ASSIGN + 서비스가 AUTHRT_READ 도 요구). 값은 esntlId 다.
   * 빈 요청·중복·추가와 회수의 겹침·미완료 요청은 서버 400 과 같은 문구로, 빈 식별자·상한(목록마다 500명)은 한국어 안내로
   * 전송 전에(동기로) 막는다(authorizationGroupMembersRequestSchema). 다른 곳에서 구성원이
   * 바뀌었으면 서버가 사람을 밝혀 409 로 거부한다 — 구성원 목록을 다시 읽어야 한다. 그룹 version 은 바뀌지 않는다.
   */
  updateGroupMembers(code: string, body: AuthorizationGroupMembersRequest): Promise<AuthorizationGroupMembersChange> {
    const request = authorizationGroupMembersRequestSchema.safeParse(body);
    if (!request.success) throw new Error(request.error.issues[0]?.message ?? '구성원 목록을 다시 조회한 뒤 저장해 주세요.');
    return this.executeGenerated(authzChangeGroupMembersOperation, { path: { code }, body: request.data })
      .then((value) => {
        const result = authorizationGroupMembersChangeSchema.parse(value);
        if (result.code !== code) throw new Error('저장한 그룹이 요청한 그룹과 일치하지 않습니다.');
        return result;
      });
  }
  async getHistory(page: number, size = 20, filters: AuthorizationHistoryFilters = {}) {
    return authorizationHistoryPageSchema.parse(await this.executeGenerated(authzHistoryOperation, { query: { ...filters, page, size } }));
  }
  async getDepartments() {
    return authorizationDepartmentsSchema.parse(await this.executeGenerated(authzDepartmentsOperation, {}));
  }
  async getDepartmentMemberships(departmentId: string) {
    const value = authorizationDepartmentSnapshotSchema.parse(await this.executeGenerated(authzDepartmentMembershipsOperation, { path: { departmentId } }));
    if (value.departmentId !== departmentId) throw new Error('조회한 부서가 요청한 부서와 일치하지 않습니다.');
    return value;
  }
  async updateDepartmentMemberships(departmentId: string, body: { userIds: string[]; groupCode: string; action: 'ADD' | 'REMOVE'; version: string; complete: true }) {
    if (!body.version || body.complete !== true || body.userIds.length === 0) throw new Error('부서 전체 명부를 확인하고 대상을 선택해 주세요.');
    const value = authorizationDepartmentSnapshotSchema.parse(await this.executeGenerated(authzUpdateDepartmentMembershipsOperation, { path: { departmentId }, body }));
    if (value.departmentId !== departmentId) throw new Error('저장한 부서가 요청한 부서와 일치하지 않습니다.');
    return value;
  }
}

export const authorizationAdminService = new AuthorizationAdminService();
