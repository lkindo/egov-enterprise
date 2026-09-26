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
    const result = await bulkUpdateUserStatusAction(['U1', 'U2'], 'D');

    expect(userAdminService.updateUsersStatus)
      .toHaveBeenCalledWith(['U1', 'U2'], 'D', AUTH);
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

  it('조직 계층은 형제 안 순서를 1부터 부여하고 루트의 상위 ID는 비운다 (DIP C5)', async () => {
    // 종전에는 평탄화 목록 전체 순번(ROOT 1, CHILD 2)을 보냈다 — sort_ordr 는 같은 상위 아래의 순서다.
    const result = await saveDeptHierarchyAction([
      { ognzId: 'ROOT', ognzNm: '본부', parentId: null, depth: 0, index: 0, unloadedParentId: null },
      { ognzId: 'CHILD', ognzNm: '개발팀', parentId: 'ROOT', depth: 1, index: 0, unloadedParentId: null },
      { ognzId: 'CHILD2', ognzNm: '운영팀', parentId: 'ROOT', depth: 1, index: 1, unloadedParentId: null },
    ]);

    expect(deptAdminService.updateDeptHierarchy).toHaveBeenCalledWith([
      { ognzId: 'ROOT', upOgnzId: undefined, sortOrdr: 1 },
      { ognzId: 'CHILD', upOgnzId: 'ROOT', sortOrdr: 1 },
      { ognzId: 'CHILD2', upOgnzId: 'ROOT', sortOrdr: 2 },
    ], AUTH);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/user/departments');
    expect(result.success).toBe(true);
  });

  /*
    GAP-DEPT-001 — 부서 검색은 `ognzNm` 만 보므로 좁힌 결과에서 상위가 빠질 수 있다. 그 노드는
    화면에 루트로 그려지고 parentId 가 null 이 되는데, 그대로 보내면 서버가 `up_ognz_id` 를 지운다.

    대조군을 함께 둔다 — 제외가 너무 넓어지면(예: 진짜 최상위까지 빼면) 계층 저장 자체가 죽는다.
  */
  it('상위를 모르는 부서는 전송에서 빼 서버의 소속을 보존한다', async () => {
    const result = await saveDeptHierarchyAction([
      { ognzId: 'ROOT', ognzNm: '본부', parentId: null, depth: 0, index: 0, unloadedParentId: null },
      // 검색 결과에 상위(HQ)가 없어 루트로 올라온 부서 — 건드리면 안 된다.
      { ognzId: 'ORPHAN', ognzNm: '외부팀', parentId: null, depth: 0, index: 1, unloadedParentId: 'HQ' },
      { ognzId: 'CHILD', ognzNm: '개발팀', parentId: 'ROOT', depth: 1, index: 0, unloadedParentId: null },
    ]);

    expect(deptAdminService.updateDeptHierarchy).toHaveBeenCalledWith([
      { ognzId: 'ROOT', upOgnzId: undefined, sortOrdr: 1 },
      // 상위를 모르는 부서는 형제 순번도 받지 않는다 — 그 형제 집합 전체를 모르기 때문이다.
      { ognzId: 'CHILD', upOgnzId: 'ROOT', sortOrdr: 1 },
    ], AUTH);
    expect(result.success).toBe(true);
  });

  it('사용자가 직접 옮긴 부서는 표시가 해제되어 그대로 전송된다', async () => {
    // useDeptTree 의 onDragEnd 가 unloadedParentId 를 null 로 해제한 뒤의 상태다.
    await saveDeptHierarchyAction([
      { ognzId: 'ROOT', ognzNm: '본부', parentId: null, depth: 0, index: 0, unloadedParentId: null },
      { ognzId: 'MOVED', ognzNm: '외부팀', parentId: 'ROOT', depth: 1, index: 0, unloadedParentId: null },
    ]);

    expect(deptAdminService.updateDeptHierarchy).toHaveBeenCalledWith([
      { ognzId: 'ROOT', upOgnzId: undefined, sortOrdr: 1 },
      { ognzId: 'MOVED', upOgnzId: 'ROOT', sortOrdr: 1 },
    ], AUTH);
  });

  it('기준선을 주면 서버에서 읽은 순서와 달라진 부서만 보낸다 (DIP C5)', async () => {
    // 검색으로 좁힌 화면에서 안 만진 부서까지 다시 보내면, 가려진 형제와 순번이 겹쳐 순서가 망가진다.
    const node = (ognzId: string, parentId: string | null, index: number) =>
      ({ ognzId, ognzNm: ognzId, parentId, depth: parentId ? 1 : 0, index, unloadedParentId: null });
    const baseline = [node('ROOT', null, 0), node('A', 'ROOT', 0), node('B', 'ROOT', 1), node('C', 'ROOT', 2), node('OTHER', null, 1)];
    // C 를 맨 앞으로 옮겼다 — A·B 는 형제 순번이 밀리고, ROOT·OTHER 는 그대로다.
    const current = [node('ROOT', null, 0), node('C', 'ROOT', 0), node('A', 'ROOT', 1), node('B', 'ROOT', 2), node('OTHER', null, 1)];

    await saveDeptHierarchyAction(current, baseline);

    expect(deptAdminService.updateDeptHierarchy).toHaveBeenCalledWith([
      { ognzId: 'C', upOgnzId: 'ROOT', sortOrdr: 1 },
      { ognzId: 'A', upOgnzId: 'ROOT', sortOrdr: 2 },
      { ognzId: 'B', upOgnzId: 'ROOT', sortOrdr: 3 },
    ], AUTH);
  });

  it('조직 계층 저장 실패는 원인 메시지를 반환하고 재검증하지 않는다', async () => {
    vi.mocked(deptAdminService.updateDeptHierarchy).mockRejectedValueOnce(new Error('동시 수정 충돌'));

    const result = await saveDeptHierarchyAction([]);

    expect(result).toEqual({ success: false, message: '동시 수정 충돌' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
