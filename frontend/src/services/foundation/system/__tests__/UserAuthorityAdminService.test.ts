import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import {
  userAuthorityAdminService,
  type AuthorGroupProjection,
  type UserAuthorityDto,
} from '../UserAuthorityAdminService';

const BASE = 'admin/system/user-authorities';

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

const makeRow = (overrides: Partial<AuthorGroupProjection> = {}): AuthorGroupProjection => ({
  scrtyDcsnTrgtId: 'TARGET_1',
  userId: 'USER_1',
  userNm: '홍길동',
  authrtId: 'ROLE_USER',
  mbrTypeCd: 'USR01',
  regYn: 'Y',
  ...overrides,
});

const makeDto = (overrides: Partial<UserAuthorityDto> = {}): UserAuthorityDto => ({
  scrtyDcsnTrgtId: 'TARGET_1',
  authrtId: 'ROLE_USER',
  ...overrides,
});

describe('UserAuthorityAdminService generated operation 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockResolvedValue(success(emptyPage));
    client.requestRaw.mockResolvedValue(success(null));
  });

  it('목록은 generated 컬렉션 경로와 빈 BaseSearchDto query를 사용한다', async () => {
    await userAuthorityAdminService.getUserAuthorityList();

    expect(client.getRaw).toHaveBeenCalledWith(BASE, { params: {} });
  });

  it('OpenAPI에 선언된 BaseSearchDto 이름과 config만 보존한다', async () => {
    const { signal } = new AbortController();

    await userAuthorityAdminService.getUserAuthorityList(
      {
        searchKeyword: '홍길동',
        searchCondition: '1',
        pageIndex: 2,
        pageUnit: 20,
        recordCountPerPage: 20,
      },
      { timeout: 3000, signal },
    );

    expect(client.getRaw).toHaveBeenCalledWith(BASE, {
      timeout: 3000,
      signal,
      params: {
        searchKeyword: '홍길동',
        searchCondition: '1',
        pageIndex: 2,
        pageUnit: 20,
        recordCountPerPage: 20,
      },
    });
  });

  it('선택 권한과 1-based 화면 페이지를 generated query로 보존한다', async () => {
    await userAuthorityAdminService.getUserAuthorityList({
      authorCode: 'ROLE_ADMIN',
      page: 2,
    });

    expect(client.getRaw).toHaveBeenCalledWith(BASE, {
      params: { authorCode: 'ROLE_ADMIN', pageIndex: 2 },
    });
  });

  it('BaseSearchDto 값 타입이 틀리면 transport 전에 차단한다', async () => {
    const call = Reflect.apply(
      userAuthorityAdminService.getUserAuthorityList,
      userAuthorityAdminService,
      [{ pageIndex: '2' }],
    );

    await expect(call).rejects.toThrow('pageIndex 쿼리 값이 숫자가 아닙니다.');
    expect(client.getRaw).not.toHaveBeenCalled();
  });

  it('generated 페이지 응답을 기존 공개 반환 형태로 검증한다', async () => {
    const page = {
      list: [makeRow({ groupId: 'GROUP_1' })],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    };
    client.getRaw.mockResolvedValueOnce(success(page));

    await expect(userAuthorityAdminService.getUserAuthorityList()).resolves.toStrictEqual(page);
  });

  it('nullable 그룹 정보는 빈 식별자로 합성하지 않고 공개 모델에서 생략한다', async () => {
    client.getRaw.mockResolvedValueOnce(success({
      list: [{ ...makeRow(), groupId: null, mberTyNm: null }],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    }));

    const result = await userAuthorityAdminService.getUserAuthorityList();

    expect(result.list[0]).toMatchObject({ authrtId: 'ROLE_USER', regYn: 'Y' });
    expect(result.list[0]).not.toHaveProperty('groupId');
    expect(result.list[0]).not.toHaveProperty('mberTyNm');
  });

  it('LEFT JOIN 미할당의 authrtId null은 regYn=N과 함께 속성 생략으로 보존한다', async () => {
    client.getRaw.mockResolvedValueOnce(success({
      list: [{ ...makeRow(), authrtId: null, regYn: 'N' }],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    }));

    const result = await userAuthorityAdminService.getUserAuthorityList();

    expect(result.list[0]).toMatchObject({ regYn: 'N' });
    expect(result.list[0]).not.toHaveProperty('authrtId');
  });

  it('regYn=Y인데 authrtId가 null인 모순 행은 fail-closed 한다', async () => {
    client.getRaw.mockResolvedValueOnce(success({
      list: [{ ...makeRow(), authrtId: null, regYn: 'Y' }],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    }));

    await expect(userAuthorityAdminService.getUserAuthorityList()).rejects.toThrow(
      '사용자 권한 응답이 필수 계약과 일치하지 않습니다.',
    );
  });

  it('공개 반환 필수 식별자가 빠진 행은 fail-closed 한다', async () => {
    client.getRaw.mockResolvedValueOnce(success({
      list: [{ userId: 'USER_1' }],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    }));

    await expect(userAuthorityAdminService.getUserAuthorityList()).rejects.toThrow(
      '사용자 권한 응답이 필수 계약과 일치하지 않습니다.',
    );
  });

  it('일괄 저장은 배열을 exact POST body로 보낸다', async () => {
    const body = [makeDto(), makeDto({ scrtyDcsnTrgtId: 'TARGET_2' })];

    await userAuthorityAdminService.saveUserAuthorities(body);

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: BASE,
      method: 'post',
      data: body,
    });
  });

  it('단건 저장은 백엔드 List 계약에 맞춰 한 요소 배열로 감싼다', async () => {
    const dto = makeDto();

    await userAuthorityAdminService.saveUserAuthority(dto);

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: BASE,
      method: 'post',
      data: [dto],
    });
  });

  it('삭제 식별자는 exact DELETE body에 유지한다', async () => {
    const ids = ['TARGET_1', 'TARGET_2'];
    const { signal } = new AbortController();

    await userAuthorityAdminService.deleteUserAuthorities(ids, { timeout: 5000, signal });

    expect(client.requestRaw).toHaveBeenCalledWith({
      timeout: 5000,
      signal,
      url: BASE,
      method: 'delete',
      data: ids,
    });
  });

  it('void operation이 non-null data를 받으면 성공으로 오인하지 않는다', async () => {
    client.requestRaw.mockResolvedValueOnce(success(1));

    await expect(userAuthorityAdminService.saveUserAuthority(makeDto())).rejects.toThrow(
      '생성 API void 응답이 OpenAPI 계약과 일치하지 않습니다.',
    );
  });

  it('config.data로 삭제 대상을 덮어쓰려 하면 요청 전에 차단한다', async () => {
    const call = Reflect.apply(
      userAuthorityAdminService.deleteUserAuthorities,
      userAuthorityAdminService,
      [['TARGET_1'], { data: ['TARGET_2'] }],
    );

    await expect(call).rejects.toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('transport 오류를 삼키지 않는다', async () => {
    const error = new Error('authority transport failed');
    client.requestRaw.mockRejectedValueOnce(error);

    await expect(userAuthorityAdminService.saveUserAuthority(makeDto())).rejects.toBe(error);
  });
});
