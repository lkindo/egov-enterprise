import { cookies } from 'next/headers';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { deptAdminService } from '@/services/foundation/system/DeptAdminService';
import type { UserOrgPrefetch, UserOrgTab } from './user-org-prefetch';

/** 서버 전용: 인증 설정은 전달할 데이터에 포함하지 않고 요청에만 사용한다. */
export async function loadUserOrgPrefetch(tab: UserOrgTab): Promise<UserOrgPrefetch> {
  if (tab === 'POLICIES') {
    return { usersPromise: Promise.resolve(null), deptsPromise: Promise.resolve(null) };
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // 요청은 기다리지 않고 함께 시작한다. 실패한 seed는 클라이언트가 재조회하도록 null로 둔다.
  const usersPromise = tab === 'DEPTS'
    ? Promise.resolve(null)
    : userAdminService.getUserList({ page: 0, size: 10, searchKeyword: '' }, config).catch(() => null);
  // 부재 탭도 사용자 상세의 부서명을 표시하므로 전량 부서 seed가 필요하다.
  const deptsPromise = deptAdminService.getDeptTree(undefined, config).catch(() => null);

  return { usersPromise, deptsPromise };
}
