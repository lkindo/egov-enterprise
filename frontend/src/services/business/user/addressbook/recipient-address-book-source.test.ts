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

  it('주소록 목록을 id·name 으로 옮긴다', async () => {
    mocks.getAddressBooks.mockResolvedValue({ list: [{ adbkSn: 7, adbkNm: '협력사' }], total: 1 });

    await expect(recipientAddressBookSource.listBooks()).resolves.toEqual([{ id: 7, name: '협력사' }]);
    expect(mocks.getAddressBooks).toHaveBeenCalledTimes(1);
    expect(mocks.getAddressBooks).toHaveBeenCalledWith({ page: 0, size: 100 });
  });

  it('[DIP B5 F4] 서버 총 건수까지 페이지를 넘겨 모두 읽는다 — 종전에는 첫 50건 뒤를 조용히 버렸다', async () => {
    const pageOf = (start: number, count: number) =>
      Array.from({ length: count }, (_, index) => ({ adbkSn: start + index, adbkNm: `주소록${start + index}` }));
    mocks.getAddressBooks
      .mockResolvedValueOnce({ list: pageOf(1, 100), total: 150 })
      .mockResolvedValueOnce({ list: pageOf(101, 50), total: 150 });

    const books = await recipientAddressBookSource.listBooks();

    expect(books).toHaveLength(150);
    expect(books[149]).toEqual({ id: 150, name: '주소록150' });
    expect(mocks.getAddressBooks).toHaveBeenNthCalledWith(1, { page: 0, size: 100 });
    expect(mocks.getAddressBooks).toHaveBeenNthCalledWith(2, { page: 1, size: 100 });
    expect(mocks.getAddressBooks).toHaveBeenCalledTimes(2);
  });

  it('서버가 페이지 크기를 줄여 돌려줘도 총 건수까지 읽는다', async () => {
    mocks.getAddressBooks
      .mockResolvedValueOnce({ list: [{ adbkSn: 1, adbkNm: '가' }], total: 2 })
      .mockResolvedValueOnce({ list: [{ adbkSn: 2, adbkNm: '나' }], total: 2 });

    await expect(recipientAddressBookSource.listBooks()).resolves.toHaveLength(2);
    expect(mocks.getAddressBooks).toHaveBeenCalledTimes(2);
  });

  it('총 건수가 없어도 꽉 찬 페이지면 다음을 읽고, 빈 페이지에서 멈춘다', async () => {
    const full = Array.from({ length: 100 }, (_, index) => ({ adbkSn: index + 1, adbkNm: `주소록${index + 1}` }));
    mocks.getAddressBooks
      .mockResolvedValueOnce({ list: full })
      .mockResolvedValueOnce({ list: [] });

    await expect(recipientAddressBookSource.listBooks()).resolves.toHaveLength(100);
    expect(mocks.getAddressBooks).toHaveBeenCalledTimes(2);
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
