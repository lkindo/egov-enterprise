import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { RoleAdminService } from '@/services/foundation/security/SecurityAdminService';
import { codeAdminService } from '../CodeAdminService';
import { userAdminService } from '../UserAdminService';

const success = <T,>(data: T) => ({
  success: true as const,
  code: 'S000',
  message: 'success',
  data,
});

describe('foundation generated operation wave2 경계', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.requestRaw.mockResolvedValue(success(null));
  });

  it('공통코드 상세는 generated path/response 계약을 사용한다', async () => {
    const code = {
      cdId: 'USE_YN',
      cdIdNm: '사용 여부',
      cdIdExpln: '사용 여부 코드',
      clsfCd: 'SYSTEM',
      useYn: 'Y' as const,
    };
    client.getRaw.mockResolvedValueOnce(success(code));

    await expect(codeAdminService.getCmmnCode('USE_YN')).resolves.toStrictEqual(code);
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/codes/cmmn/USE_YN', undefined);
  });

  it('보안 롤 상세는 generated path/response 계약을 사용한다', async () => {
    const role = {
      roleId: 'ROLE_READ',
      roleNm: '조회 롤',
      rolePatrn: '/admin/**',
      roleExpln: '조회 전용',
      roleTypeCd: 'url',
      roleSort: '1',
    };
    client.getRaw.mockResolvedValueOnce(success(role));

    await expect(new RoleAdminService().getRole('ROLE_READ')).resolves.toStrictEqual(role);
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/roles/ROLE_READ', undefined);
  });

  it('사용자 상태 변경은 generated PATCH request 계약을 사용한다', async () => {
    await userAdminService.updateUsersStatus(['user_1'], 'A');

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/users/status',
      method: 'patch',
      data: { userIds: ['user_1'], status: 'A' },
    });
  });

  it('사용자 프로필 수정은 경로 ID를 본문에 복제하지 않고 비밀번호도 요구하지 않는다', async () => {
    await userAdminService.updateUser('user_1', {
      userNm: '변경 사용자',
      emlAddr: 'changed@example.com',
    });

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/users/user_1',
      method: 'put',
      data: { userNm: '변경 사용자', emlAddr: 'changed@example.com' },
    });
  });

  it('사용자 등록의 서버 식별자 응답은 기존 void 공개 표면에서 노출하지 않는다', async () => {
    client.requestRaw.mockResolvedValueOnce(success('user_1'));
    const request = {
      userId: 'user_1',
      userNm: '사용자1',
      pswd: 'Password1!',
      emlAddr: 'user1@example.com',
      userSttsCd: 'A',
    };

    await expect(userAdminService.createUser(request)).resolves.toBeUndefined();
  });

  it('사용자 조회는 비밀번호를 응답에서 허용하지 않고 공개 allowlist만 반환한다', async () => {
    const safeUser = {
      userId: 'user_1',
      userNm: '사용자1',
      emlAddr: 'user1@example.com',
      userSttsCd: 'A',
    };
    client.getRaw.mockResolvedValueOnce(success(safeUser));
    await expect(userAdminService.getUser('user_1')).resolves.toStrictEqual(safeUser);

    client.getRaw.mockResolvedValueOnce(success({
      ...safeUser,
      pswd: 'response-secret-marker',
    }));
    await expect(userAdminService.getUser('user_1')).rejects.toThrow(
      '생성 API 응답에 허용되지 않은 필드가 있습니다.',
    );
  });

  it('이메일이 없는 정상 사용자는 생성 응답 계약을 통과하고 필드를 임의로 합성하지 않는다', async () => {
    const userWithoutEmail = {
      userId: 'user_2',
      userNm: '사용자2',
      userSttsCd: 'A',
    };
    client.getRaw.mockResolvedValueOnce(success(userWithoutEmail));

    await expect(userAdminService.getUser('user_2')).resolves.toStrictEqual(userWithoutEmail);
  });

  it('목록 projection에 없는 상태 코드는 임의로 요구하거나 합성하지 않는다', async () => {
    const page = {
      list: [{
        userId: 'user_3',
        userNm: '목록 사용자',
        emlAddr: 'list@example.com',
      }],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    };
    client.getRaw.mockResolvedValueOnce(success(page));

    await expect(userAdminService.getUserList({ page: 0, size: 10 })).resolves.toStrictEqual(page);
  });

  it('수정 폼의 식별자와 비밀번호는 전송하지 않고 관리자 프로필 허용 필드만 투영한다', async () => {
    const formPayload = {
      userId: 'user_4',
      userNm: '수정 사용자',
      pswd: '',
      emlAddr: 'updated@example.com',
      mblTelno: '01012345678',
      ognzId: 'ORG_001',
    };

    await userAdminService.updateUser('user_4', formPayload);

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/users/user_4',
      method: 'put',
      data: {
        userNm: '수정 사용자',
        emlAddr: 'updated@example.com',
        mblTelno: '01012345678',
        ognzId: 'ORG_001',
      },
    });
  });
});
