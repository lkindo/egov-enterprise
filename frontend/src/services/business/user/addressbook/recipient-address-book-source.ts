import type { RecipientAddressBookSource } from '@/types/recipient-address-book';
import { addressbookUserService } from './AddressbookUserService';

/**
 * 주소록(demo pack) → 수신자 피커 주입 계약 어댑터.
 *
 * 피커는 이 모듈을 직접 알지 못한다. 메일·문자 발송 화면이 `reusable-base:demo` 마커 블록 안에서만 이 값을 넘기므로,
 * demo pack 이 빠진 프로필에서는 이 파일과 주입 줄이 함께 사라지고 피커는 사용자 검색 탭만 보인다.
 * 요청 형태는 종전 피커가 직접 부르던 것과 같다(목록 50건, 명함은 주소록 단건 조회의 adbkMan).
 */
export const recipientAddressBookSource: RecipientAddressBookSource = {
  async listBooks() {
    const page = await addressbookUserService.getAddressBooks({ page: 0, size: 50 });
    return (page.list ?? []).map((book) => ({ id: book.adbkSn, name: book.adbkNm }));
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
