import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 부서 → 수신자 피커 주입 어댑터 계약(2026-09-27 DIP B5 F5).
 *
 * 1) 조직도를 위에서 아래로 펴되 상위를 잃은 부서·순환 고리도 빠뜨리지 않는다 — 목록에서 사라진 부서의 사람은 고를 수 없다.
 * 2) 소속 인원 응답을 피커 모양으로 옮기며 절단 여부를 버리지 않는다.
 * 3) 두 권한(DEPT_READ·USER_READ)을 모두 가진 사람에게만 출처를 준다 — 하나라도 없으면 탭을 눌러도 403 이다.
 */
const mocks = vi.hoisted(() => ({
  getDeptTree: vi.fn(),
  getDepartmentRecipients: vi.fn(),
  auth: { current: undefined as undefined | { user: { permissions: string[]; authorizationVersion: string } | null } },
}));

vi.mock('@/services/foundation/system/DeptAdminService', () => ({ deptAdminService: { getDeptTree: (...a: unknown[]) => mocks.getDeptTree(...a) } }));
vi.mock('@/services/foundation/system/UserAdminService', () => ({
  userAdminService: { getDepartmentRecipients: (...a: unknown[]) => mocks.getDepartmentRecipients(...a) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useOptionalAuth: () => mocks.auth.current }));

import { flattenDepartments, recipientDepartmentSource, useRecipientDepartmentSource } from '../recipient-department-source';

describe('recipient-department-source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.current = undefined;
  });

  it('조직도를 정렬 순서대로 펴고 깊이를 싣는다 — 상위를 잃은 부서는 최상위, 순환 고리도 한 번씩 싣는다', () => {
    const flat = flattenDepartments([
      { ognzId: 'C', ognzNm: '예산계', upOgnzId: 'A', sortOrdr: 2 },
      { ognzId: 'B', ognzNm: '총무계', upOgnzId: 'A', sortOrdr: 1 },
      { ognzId: 'A', ognzNm: '기획국', sortOrdr: 1 },
      { ognzId: 'O', ognzNm: '고아부서', upOgnzId: 'GONE', sortOrdr: 5 },
      { ognzId: 'X', ognzNm: '고리1', upOgnzId: 'Y' },
      { ognzId: 'Y', ognzNm: '고리2', upOgnzId: 'X' },
    ]);

    expect(flat.slice(0, 4)).toEqual([
      { id: 'A', name: '기획국', depth: 0 },
      { id: 'B', name: '총무계', depth: 1 },
      { id: 'C', name: '예산계', depth: 1 },
      { id: 'O', name: '고아부서', depth: 0 },
    ]);
    expect(flat.map((item) => item.id).sort()).toEqual(['A', 'B', 'C', 'O', 'X', 'Y']);
  });

  it('소속 인원을 피커 모양으로 옮기고 절단 여부를 싣는다 — 식별자 없는 행은 고를 수 없어 뺀다', async () => {
    mocks.getDepartmentRecipients.mockResolvedValueOnce({
      members: [
        { esntlId: 'E1', userNm: '김갑', deptNm: '기획팀', absent: true },
        { esntlId: 'E2' },
        { userNm: '식별자없음' },
      ],
      truncated: true,
    });

    await expect(recipientDepartmentSource.listMembers('ORG_A')).resolves.toEqual({
      members: [
        { esntlId: 'E1', name: '김갑', deptNm: '기획팀', absent: true },
        { esntlId: 'E2', name: 'E2', deptNm: undefined, absent: undefined },
      ],
      truncated: true,
    });
    expect(mocks.getDepartmentRecipients).toHaveBeenCalledWith('ORG_A');
  });

  it('부서 목록은 조직도 조회를 편 결과다', async () => {
    mocks.getDeptTree.mockResolvedValueOnce([{ ognzId: 'A', ognzNm: '기획국' }]);
    await expect(recipientDepartmentSource.listDepartments()).resolves.toEqual([{ id: 'A', name: '기획국', depth: 0 }]);
  });

  it('DEPT_READ·USER_READ 를 모두 가진 사람에게만 출처를 준다', () => {
    const withPermissions = (permissions: string[]) => {
      mocks.auth.current = { user: { permissions, authorizationVersion: 'v1' } };
      return renderHook(() => useRecipientDepartmentSource()).result.current;
    };

    expect(withPermissions(['DEPT_READ', 'USER_READ'])).toBe(recipientDepartmentSource);
    expect(withPermissions(['DEPT_READ'])).toBeUndefined();
    expect(withPermissions(['USER_READ'])).toBeUndefined();
    mocks.auth.current = undefined;
    expect(renderHook(() => useRecipientDepartmentSource()).result.current).toBeUndefined();
  });
});
