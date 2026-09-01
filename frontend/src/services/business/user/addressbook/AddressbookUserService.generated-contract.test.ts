import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { addressbookUserService } from './AddressbookUserService';

const successEnvelope = (data: unknown) => ({
  success: true,
  code: 'S000',
  message: '성공',
  data,
});

const member = { userId: 'user01', nm: '홍길동', emlAddr: 'user@example.com' };
const addressBook = {
  adbkSn: 3,
  adbkNm: '영업팀',
  rlsScopeCd: 'PUBLIC',
  wrterId: 'writer01',
  crtDt: '2026-08-31T12:00:00',
  adbkMan: [member],
};

describe('AddressbookUserService generated contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('6개 경계를 generated operation으로 실행하고 검색 기본축을 보존한다', async () => {
    client.getRaw
      .mockResolvedValueOnce(successEnvelope({ list: [addressBook], total: 1 }))
      .mockResolvedValueOnce(successEnvelope(addressBook))
      .mockResolvedValueOnce(successEnvelope({ list: [member], total: 1 }));
    client.requestRaw
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null));
    const config = { headers: { 'X-Trace-Test': 'address-book' } };

    await expect(addressbookUserService.getAddressBooks(
      { page: 0, size: 20, searchWrd: '영업' },
      config,
    )).resolves.toMatchObject({ list: [addressBook], total: 1 });
    await expect(addressbookUserService.getAddressBook(3)).resolves.toEqual(addressBook);
    await expect(addressbookUserService.createAddressBook({
      adbkNm: '영업팀',
      rlsScopeCd: 'PUBLIC',
      adbkMan: [member],
    })).resolves.toBeUndefined();
    await expect(addressbookUserService.updateAddressBook(3, {
      adbkNm: '영업1팀',
      rlsScopeCd: 'PUBLIC',
    })).resolves.toBeUndefined();
    await expect(addressbookUserService.deleteAddressBook(3)).resolves.toBeUndefined();
    await expect(addressbookUserService.searchUsers('홍길동')).resolves.toMatchObject({
      list: [member],
      total: 1,
    });

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'address-books', {
      ...config,
      params: { page: 0, size: 20, searchWrd: '영업', searchCnd: '0' },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'address-books/3', undefined);
    expect(client.getRaw).toHaveBeenNthCalledWith(3, 'address-books/search-users', {
      params: { searchWrd: '홍길동' },
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'address-books',
      method: 'post',
      data: { adbkNm: '영업팀', rlsScopeCd: 'PUBLIC', adbkMan: [member] },
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'address-books/3',
      method: 'put',
      data: { adbkNm: '영업1팀', rlsScopeCd: 'PUBLIC' },
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(3, {
      url: 'address-books/3',
      method: 'delete',
    });
  });

  it('AddressBookDto와 다른 응답은 경계에서 거부한다', async () => {
    client.getRaw.mockResolvedValueOnce(successEnvelope({ adbkNm: 42, rlsScopeCd: 'PUBLIC' }));

    await expect(addressbookUserService.getAddressBook(3)).rejects.toThrow(
      '생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.',
    );
  });

  it('필수 rlsScopeCd가 없는 요청은 transport 전에 거부한다', async () => {
    await expect(addressbookUserService.createAddressBook({ adbkNm: '영업팀' } as never))
      .rejects.toThrow('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');
    expect(client.requestRaw).not.toHaveBeenCalled();
  });
});
