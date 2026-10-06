import type { Department } from '@/services/foundation/system/DeptAdminService';
import type { PageResponse } from '@/types/foundation/system';
import type { UserManage } from '@/types/foundation/user';

export type UserOrgTab = 'USERS' | 'DEPTS' | 'ABSENCES' | 'POLICIES';

/** null은 조회 실패 또는 이 탭에 불필요한 seed다. 빈 결과와 구별한다. */
export interface UserOrgPrefetch {
  usersPromise: Promise<PageResponse<UserManage> | null>;
  deptsPromise: Promise<Department[] | null>;
}
