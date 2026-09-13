import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAddressBooks: vi.fn(),
  getAddressBook: vi.fn(),
}));

vi.mock('./AddressbookUserService', () => ({
  addressbookUserService: {
    getAddressBooks: mocks.getAddressBooks,
    getAddressBook: mocks.getAddressBook,
  },
}));

import { recipientAddressBookSource } from './recipient-address-book-source';

describe('recipientAddressBookSource', () => {
  beforeEach(() => {
    mocks.getAddressBooks.mockReset();
    mocks.getAddressBook.mockReset();
  });

  it('주소록 목록은 종전 피커와 같은 요청(50건)으로 읽고 id·name 으로 옮긴다', async () => {
    mocks.getAddressBooks.mockResolvedValue({ list: [{ adbkSn: 7, adbkNm: '협력사' }], totCnt: 1 });

    await expect(recipientAddressBookSource.listBooks()).resolves.toEqual([{ id: 7, name: '협력사' }]);
    expect(mocks.getAddressBooks).toHaveBeenCalledWith({ page: 0, size: 50 });
  });

  it('목록이 비어 오면 빈 배열이다', async () => {
    mocks.getAddressBooks.mockResolvedValue({ totCnt: 0 });
    await expect(recipientAddressBookSource.listBooks()).resolves.toEqual([]);
  });

  it('명함은 주소록 단건 조회의 adbkMan 에서 이름·이메일·휴대전화를 옮긴다', async () => {
    mocks.getAddressBook.mockResolvedValue({
      adbkSn: 7,
      adbkNm: '협력사',
      adbkMan: [{ adbkMbrSn: 11, nm: '홍길동', emlAddr: 'hong@example.com', mblTelno: '01012345678' }],
    });

    await expect(recipientAddressBookSource.listContacts(7)).resolves.toEqual([
      { id: 11, name: '홍길동', email: 'hong@example.com', phone: '01012345678' },
    ]);
    expect(mocks.getAddressBook).toHaveBeenCalledWith(7);
  });

  it('명함이 없으면 빈 배열이고, 조회 실패는 삼키지 않고 그대로 전파한다', async () => {
    mocks.getAddressBook.mockResolvedValueOnce({ adbkSn: 7, adbkNm: '빈 주소록' });
    await expect(recipientAddressBookSource.listContacts(7)).resolves.toEqual([]);

    mocks.getAddressBook.mockRejectedValueOnce(new Error('network'));
    await expect(recipientAddressBookSource.listContacts(7)).rejects.toThrow('network');
  });
});
