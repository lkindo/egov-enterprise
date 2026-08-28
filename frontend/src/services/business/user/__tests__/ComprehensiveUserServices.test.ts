vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { addressbookUserService } from '../addressbook/AddressbookUserService';
import { communityUserService } from '../community/CommunityUserService';
import { deptJobUserService } from '../deptJob/DeptJobUserService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('Comprehensive User Services', () => {
  beforeEach(() => vi.clearAllMocks());

  it('addressbookUserService calls correct endpoints', async () => {
    (client.get as any).mockResolvedValue({ result: { content: [] } });
    await addressbookUserService.getAddressBooks({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('address-books', expect.any(Object));
  });

  /*
   * 서버(AddressBookRepositoryImpl)는 searchCnd 가 '0'/'1' 일 때만 검색 조건을 만든다.
   * 종전에는 두 호출부 모두 searchCnd 를 보내지 않아 QueryDSL 의 and(null) 로 무시됐고,
   * **검색어를 넣어도 목록과 총건수가 전체 그대로**였다. 오류도 로딩도 없어 사용자는 알 수 없다.
   */
  it('addressbookUserService 는 검색어가 서버에 닿도록 searchCnd 를 실어 보낸다', async () => {
    (client.get as any).mockResolvedValue({ list: [], total: 0, totalPage: 0 });
    await addressbookUserService.getAddressBooks({ page: 0, size: 10, searchWrd: '영업팀' });

    const [, config] = (client.get as any).mock.calls.at(-1);
    expect(config.params).toMatchObject({ searchWrd: '영업팀', searchCnd: '0' });
  });

  it('addressbookUserService 는 호출부가 고른 검색 축을 덮어쓰지 않는다', async () => {
    (client.get as any).mockResolvedValue({ list: [], total: 0, totalPage: 0 });
    await addressbookUserService.getAddressBooks({ page: 0, searchWrd: 'kim', searchCnd: '1' });

    const [, config] = (client.get as any).mock.calls.at(-1);
    expect(config.params.searchCnd).toBe('1');
  });

  it('communityUserService calls correct endpoints', async () => {
    await communityUserService.getCommunityList({} as any);
    expect(client.get).toHaveBeenCalledWith('communities', expect.any(Object));
  });

  it('deptJobUserService calls correct endpoints', async () => {
    await deptJobUserService.getDeptJobBoxes({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('dept-jobs/boxes', expect.any(Object));
  });
});
