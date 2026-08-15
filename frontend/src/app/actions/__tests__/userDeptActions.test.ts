vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { saveDeptHierarchyAction } from '../deptActions';
import {
  bulkDeleteUsersAction,
  bulkMoveUserDeptAction,
  bulkUpdateUserRoleAction,
  bulkUpdateUserStatusAction,
} from '../userActions';
import { deptAdminService } from '@/services/foundation/system/DeptAdminService';
import { userAdminService } from '@/services/foundation/system/UserAdminService';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/services/foundation/system/UserAdminService', () => ({
  userAdminService: {
    updateUsersStatus: vi.fn(),
    moveUsersToDept: vi.fn(),
    deleteUsers: vi.fn(),
    updateUsersRole: vi.fn(),
  },
}));
vi.mock('@/services/foundation/system/DeptAdminService', () => ({
  deptAdminService: { updateDeptHierarchy: vi.fn() },
}));

const AUTH = { headers: { Authorization: 'Bearer TOKEN-123' } };
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

function withToken(token: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === 'accessToken' && token ? { name, value: token } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

describe('사용자·조직 관리자 서버 액션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withToken('TOKEN-123');
  });

  afterAll(() => consoleError.mockRestore());

  it('상태 일괄 변경은 대상·상태·인증을 전달하고 목록을 재검증한다', async () => {
    const result = await bulkUpdateUserStatusAction(['U1', 'U2'], 'ACTIVE');

    expect(userAdminService.updateUsersStatus)
      .toHaveBeenCalledWith(['U1', 'U2'], 'ACTIVE', AUTH);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/user/manage');
    expect(result).toEqual({ success: true, message: '2명의 사용자 상태가 변경되었습니다.' });
  });

  it('부서 이동은 조직 ID를 잃지 않고 전달한다', async () => {
    const result = await bulkMoveUserDeptAction(['U1'], 'DEPT-7');

    expect(userAdminService.moveUsersToDept).toHaveBeenCalledWith(['U1'], 'DEPT-7', AUTH);
    expect(result).toEqual({ success: true, message: '1명의 사용자가 부서 이동되었습니다.' });
  });

  it('삭제는 토큰이 없을 때 임의 Authorization 헤더를 만들지 않는다', async () => {
    withToken(undefined);

    const result = await bulkDeleteUsersAction(['U1']);

    expect(userAdminService.deleteUsers).toHaveBeenCalledWith(['U1'], {});
    expect(result).toEqual({ success: true, message: '1명의 사용자가 삭제되었습니다.' });
  });

  it('권한 변경 실패는 백엔드 메시지를 반환하고 성공 캐시 무효화를 하지 않는다', async () => {
    vi.mocked(userAdminService.updateUsersRole).mockRejectedValueOnce({
      response: { data: { message: '부여할 수 없는 권한입니다.' } },
    });

    const result = await bulkUpdateUserRoleAction(['U1'], 'SUPER_ADMIN');

    expect(result).toEqual({ success: false, message: '부여할 수 없는 권한입니다.' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('조직 계층은 화면 순서를 1부터 부여하고 루트의 상위 ID는 비운다', async () => {
    const result = await saveDeptHierarchyAction([
      { ognzId: 'ROOT', ognzNm: '본부', parentId: null, depth: 0, index: 0 },
      { ognzId: 'CHILD', ognzNm: '개발팀', parentId: 'ROOT', depth: 1, index: 0 },
    ]);

    expect(deptAdminService.updateDeptHierarchy).toHaveBeenCalledWith([
      { ognzId: 'ROOT', upOgnzId: undefined, sortOrdr: 1 },
      { ognzId: 'CHILD', upOgnzId: 'ROOT', sortOrdr: 2 },
    ], AUTH);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/user/departments');
    expect(result.success).toBe(true);
  });

  it('조직 계층 저장 실패는 원인 메시지를 반환하고 재검증하지 않는다', async () => {
    vi.mocked(deptAdminService.updateDeptHierarchy).mockRejectedValueOnce(new Error('동시 수정 충돌'));

    const result = await saveDeptHierarchyAction([]);

    expect(result).toEqual({ success: false, message: '동시 수정 충돌' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
