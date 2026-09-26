import type { RecipientAddressBook, RecipientAddressBookSource } from '@/types/recipient-address-book';
import { addressbookUserService } from './AddressbookUserService';

/** 한 번에 읽는 주소록 수. 서버 총 건수(total)에 닿을 때까지 페이지를 넘긴다. */
const BOOK_PAGE_SIZE = 100;
/** 응답이 끝을 알리지 않는 경우의 폭주 방지 상한(1만 개). 실제 주소록 수가 여기에 닿는 일은 없다. */
const MAX_BOOK_PAGES = 100;

/**
 * 주소록(demo pack) → 수신자 피커 주입 계약 어댑터.
 *
 * 피커는 이 모듈을 직접 알지 못한다. 메일·문자 발송 화면이 `reusable-base:demo` 마커 블록 안에서만 이 값을 넘기므로,
 * demo pack 이 빠진 프로필에서는 이 파일과 주입 줄이 함께 사라지고 피커는 사용자 검색 탭만 보인다.
 * 명함은 주소록 단건 조회의 adbkMan 에서 읽는다.
 *
 * [2026-09-26 DIP B5 F4] 주소록 목록은 서버 총 건수까지 모두 읽는다. 종전에는 첫 페이지 50건만 읽어
 *   51번째 주소록부터는 피커에 나타나지 않았고, 화면은 그 사실을 말하지 않았다.
 */
export const recipientAddressBookSource: RecipientAddressBookSource = {
  async listBooks() {
    const books: RecipientAddressBook[] = [];
    for (let page = 0; ; page += 1) {
      const result = await addressbookUserService.getAddressBooks({ page, size: BOOK_PAGE_SIZE });
      const list = result.list ?? [];
      books.push(...list.map((book) => ({ id: book.adbkSn, name: book.adbkNm })));
      // 총 건수가 있으면 그것까지 읽는다 — 서버가 페이지 크기를 줄여 돌려줘도 잘리지 않는다.
      // 총 건수가 없으면 요청보다 적게 온 페이지를 마지막으로 본다. 빈 페이지는 언제나 끝이다.
      const total = typeof result.total === 'number' ? result.total : undefined;
      if (list.length === 0) break;
      if (total !== undefined ? books.length >= total : list.length < BOOK_PAGE_SIZE) break;
      if (page + 1 >= MAX_BOOK_PAGES) break;
    }
    return books;
  },
  async listContacts(bookId) {
    const book = await addressbookUserService.getAddressBook(bookId);
    return (book.adbkMan ?? []).map((card) => ({
      id: card.adbkMbrSn,
      name: card.nm,
      email: card.emlAddr,
      phone: card.mblTelno,
    }));
  },
};
