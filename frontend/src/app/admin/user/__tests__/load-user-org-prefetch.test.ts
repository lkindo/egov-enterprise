import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import { deptAdminService, type Department } from '@/services/foundation/system/DeptAdminService';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import type { PageResponse } from '@/types/foundation/system';
import type { UserManage } from '@/types/foundation/user';
import { loadUserOrgPrefetch } from '../load-user-org-prefetch';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/services/foundation/system/DeptAdminService', () => ({ deptAdminService: { getDeptTree: vi.fn() } }));
vi.mock('@/services/foundation/system/UserAdminService', () => ({ userAdminService: { getUserList: vi.fn() } }));

const USERS: PageResponse<UserManage> = { list: [], total: 0, page: 1, size: 10, totalPage: 0 };
const DEPTS: Department[] = [{ ognzId: 'ROOT', ognzNm: '본부' }];

describe('사용자·조직 서버 프리페치', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
    vi.mocked(userAdminService.getUserList).mockResolvedValue(USERS);
    vi.mocked(deptAdminService.getDeptTree).mockResolvedValue(DEPTS);
  });

  it('정책 탭은 사용자·부서와 인증 쿠키를 조회하지 않는다', async () => {
    const prefetch = await loadUserOrgPrefetch('POLICIES');

    expect(await prefetch.usersPromise).toBeNull();
    expect(await prefetch.deptsPromise).toBeNull();
    expect(cookies).not.toHaveBeenCalled();
    expect(userAdminService.getUserList).not.toHaveBeenCalled();
    expect(deptAdminService.getDeptTree).not.toHaveBeenCalled();
  });

  it('부서 탭은 전량 부서만 조회한다', async () => {
    const prefetch = await loadUserOrgPrefetch('DEPTS');

    expect(await prefetch.usersPromise).toBeNull();
    expect(await prefetch.deptsPromise).toEqual(DEPTS);
    expect(userAdminService.getUserList).not.toHaveBeenCalled();
    expect(deptAdminService.getDeptTree).toHaveBeenCalledWith(undefined, {});
  });

  it.each(['USERS', 'ABSENCES'] as const)('%s 탭은 사용자 목록과 상세 표시에 필요한 부서를 함께 조회한다', async (tab) => {
    const prefetch = await loadUserOrgPrefetch(tab);

    expect(await prefetch.usersPromise).toEqual(USERS);
    expect(await prefetch.deptsPromise).toEqual(DEPTS);
    expect(userAdminService.getUserList).toHaveBeenCalledWith({ page: 0, size: 10, searchKeyword: '' }, {});
    expect(deptAdminService.getDeptTree).toHaveBeenCalledWith(undefined, {});
  });

  it('응답을 기다리지 않고 두 요청을 시작하며 인증 설정은 요청에만 전달한다', async () => {
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: 'test-access-token' }) } as never);
    vi.mocked(userAdminService.getUserList).mockReturnValue(new Promise(() => {}));
    vi.mocked(deptAdminService.getDeptTree).mockReturnValue(new Promise(() => {}));

    const prefetch = await loadUserOrgPrefetch('USERS');

    const config = { headers: { Authorization: 'Bearer test-access-token' } };
    expect(userAdminService.getUserList).toHaveBeenCalledWith(expect.any(Object), config);
    expect(deptAdminService.getDeptTree).toHaveBeenCalledWith(undefined, config);
    expect(Object.keys(prefetch).sort()).toEqual(['deptsPromise', 'usersPromise']);
  });

  it('실패한 seed는 클라이언트 재조회를 위해 null로 보존한다', async () => {
    vi.mocked(userAdminService.getUserList).mockRejectedValue(new Error('users unavailable'));
    vi.mocked(deptAdminService.getDeptTree).mockRejectedValue(new Error('departments unavailable'));

    const prefetch = await loadUserOrgPrefetch('USERS');

    expect(await prefetch.usersPromise).toBeNull();
    expect(await prefetch.deptsPromise).toBeNull();
  });
});
