import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { deptAuthorityAdminService } from '../DeptAuthorityAdminService';

const BASE = 'admin/system/dept-authorities';

const success = <T,>(data: T) => ({
  success: true as const,
  code: 'S000',
  message: 'success',
  data,
});

const emptyPage = {
  list: [],
  total: 0,
  page: 0,
  size: 10,
  totalPage: 0,
};

const row = {
  deptCode: 'DEPT_001',
  deptNm: '경영지원부',
  userId: 'USER_1',
  userNm: '홍길동',
  authrtId: 'ROLE_ADMIN',
  scrtyDcsnTrgtId: 'TARGET_1',
  regYn: 'Y',
};

describe('DeptAuthorityAdminService generated operation 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockResolvedValue(success(emptyPage));
    client.requestRaw.mockResolvedValue(success(null));
  });

  it('부서 식별자를 generated path에 넣고 선언된 빈 query를 보낸다', async () => {
    await deptAuthorityAdminService.getDeptAuthorities('DEPT_001');

    expect(client.getRaw).toHaveBeenCalledWith(`${BASE}/DEPT_001`, { params: {} });
  });

  it('경로 식별자를 URL 인코딩하고 호출부 config를 보존한다', async () => {
    const { signal } = new AbortController();

    await deptAuthorityAdminService.getDeptAuthorities('DEPT A/1', {
      timeout: 3000,
      signal,
    });

    expect(client.getRaw).toHaveBeenCalledWith(`${BASE}/DEPT%20A%2F1`, {
      timeout: 3000,
      signal,
      params: {},
    });
  });

  it('generated PageResponse를 공개 페이지 반환으로 검증한다', async () => {
    const page = {
      list: [row],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    };
    client.getRaw.mockResolvedValueOnce(success(page));

    await expect(deptAuthorityAdminService.getDeptAuthorities('DEPT_001'))
      .resolves.toStrictEqual(page);
  });

  it('공개 반환 필수 식별자가 빠진 행은 fail-closed 한다', async () => {
    client.getRaw.mockResolvedValueOnce(success({
      list: [{ deptCode: 'DEPT_001' }],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    }));

    await expect(deptAuthorityAdminService.getDeptAuthorities('DEPT_001')).rejects.toThrow(
      '부서 권한 응답이 필수 계약과 일치하지 않습니다.',
    );
  });

  it('일괄 저장은 리터럴 batch 경로와 단건 body를 사용한다', async () => {
    const body = { deptId: 'DEPT_001', authrtId: 'ROLE_ADMIN', allMembers: true };

    await deptAuthorityAdminService.updateDeptAuthorities(body);

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: `${BASE}/batch`,
      method: 'post',
      data: body,
    });
  });

  it('userIds의 순서와 중복 및 호출부 config를 보존한다', async () => {
    const body = {
      deptId: 'DEPT_002',
      authrtId: 'ROLE_USER',
      allMembers: false,
      userIds: ['USER_3', 'USER_1', 'USER_3'],
    };
    const headers = { Authorization: 'Bearer test-token' };

    await deptAuthorityAdminService.updateDeptAuthorities(body, { headers, timeout: 5000 });

    expect(client.requestRaw).toHaveBeenCalledWith({
      headers,
      timeout: 5000,
      url: `${BASE}/batch`,
      method: 'post',
      data: body,
    });
  });

  it('config.params로 query를 우회 주입하면 요청 전에 차단한다', async () => {
    const call = Reflect.apply(
      deptAuthorityAdminService.getDeptAuthorities,
      deptAuthorityAdminService,
      ['DEPT_001', { params: { pageIndex: 1 } }],
    );

    await expect(call).rejects.toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
    expect(client.getRaw).not.toHaveBeenCalled();
  });

  it('void 응답이 non-null data를 포함하면 성공으로 오인하지 않는다', async () => {
    client.requestRaw.mockResolvedValueOnce(success({ updated: 1 }));

    await expect(deptAuthorityAdminService.updateDeptAuthorities({
      deptId: 'DEPT_001',
      authrtId: 'ROLE_ADMIN',
      allMembers: true,
    })).rejects.toThrow('생성 API void 응답이 OpenAPI 계약과 일치하지 않습니다.');
  });

  it('transport 오류를 빈 페이지로 바꾸지 않고 전파한다', async () => {
    const error = new Error('department authority transport failed');
    client.getRaw.mockRejectedValueOnce(error);

    await expect(deptAuthorityAdminService.getDeptAuthorities('DEPT_001')).rejects.toBe(error);
  });
});
