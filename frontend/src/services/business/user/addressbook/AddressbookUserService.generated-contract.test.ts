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
const selection = { esntlId: 'internal-user-01', userNm: '홍길동', ognzNm: '영업부' };
/** [DIP B5 F8] 구성원 userId 는 서버 소유 읽기 전용이라 요청에는 싣지 않는다(응답에는 실린다). */
const memberRequest = { nm: '홍길동', emlAddr: 'user@example.com' };
const addressBook = {
  adbkSn: 3,
  adbkNm: '영업팀',
  rlsScopeCd: 'PUBLIC',
  wrterId: 'writer01',
  crtDt: '2026-08-31T12:00:00',
  editToken: 'a'.repeat(64),
  adbkMan: [member],
};

describe('AddressbookUserService generated contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('6개 경계를 generated operation으로 실행하고 검색 기본축을 보존한다', async () => {
    client.getRaw
      .mockResolvedValueOnce(successEnvelope({ list: [addressBook], total: 1 }))
      .mockResolvedValueOnce(successEnvelope(addressBook))
      .mockResolvedValueOnce(successEnvelope({ list: [selection], total: 1 }));
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
      adbkMan: [memberRequest],
    })).resolves.toBeUndefined();
    await expect(addressbookUserService.updateAddressBook(3, {
      adbkNm: '영업1팀',
      rlsScopeCd: 'PUBLIC',
      editToken: addressBook.editToken,
    })).resolves.toBeUndefined();
    await expect(addressbookUserService.deleteAddressBook(3)).resolves.toBeUndefined();
    await expect(addressbookUserService.searchUserSelections('홍길동')).resolves.toMatchObject({
      list: [selection],
      total: 1,
    });

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'address-books', {
      ...config,
      params: { page: 0, size: 20, searchWrd: '영업', searchCnd: '0' },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'address-books/3', undefined);
    expect(client.getRaw).toHaveBeenNthCalledWith(3, 'address-books/user-selections', {
      params: { searchWrd: '홍길동' },
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'address-books',
      method: 'post',
      data: { adbkNm: '영업팀', rlsScopeCd: 'PUBLIC', adbkMan: [memberRequest] },
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'address-books/3',
      method: 'put',
      data: { adbkNm: '영업1팀', rlsScopeCd: 'PUBLIC', editToken: addressBook.editToken },
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(3, {
      url: 'address-books/3',
      method: 'delete',
    });
  });

  it.each(['emlAddr', 'mblTelno', 'userId'])('선택 응답에 %s가 재유입해도 소비자에게 전달하지 않는다', async (field) => {
    client.getRaw.mockResolvedValueOnce(successEnvelope({ list: [{ ...selection, [field]: 'private-value' }], total: 1 }));
    const response = await addressbookUserService.searchUserSelections('홍길동');
    expect(response.list).toEqual([selection]);
    expect(response.list[0]).not.toHaveProperty(field);
  });

  it('AddressBookDto와 다른 응답은 경계에서 거부한다', async () => {
    client.getRaw.mockResolvedValueOnce(successEnvelope({ adbkNm: 42, rlsScopeCd: 'PUBLIC' }));

    await expect(addressbookUserService.getAddressBook(3)).rejects.toThrow(
      '생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.',
    );
  });

  it('[DIP B5 F8] 서버 소유 구성원 userId 를 요청에 실으면 transport 전에 거부한다', async () => {
    await expect(addressbookUserService.createAddressBook({
      adbkNm: '영업팀',
      rlsScopeCd: 'PUBLIC',
      adbkMan: [member],
    })).rejects.toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('필수 rlsScopeCd가 없는 요청은 transport 전에 거부한다', async () => {
    await expect(addressbookUserService.createAddressBook({ adbkNm: '영업팀' } as never))
      .rejects.toThrow('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');
    expect(client.requestRaw).not.toHaveBeenCalled();
  });
});
