/**
 * 수신자 피커(RecipientPicker)가 주소록 탭을 그릴 때 받는 **주입 계약**.
 *
 * [2026-09-13 GAP-PACK-001 ②] 주소록 구현은 demo pack 소유다. 공용 피커가 그 구현을 직접 import 하면
 * 재사용 base 생성기가 collaboration 프로필에서 피커와 그 소비 화면(쪽지·메일·문자·알림 발송)을 import 그래프로
 * 함께 제거한다. 그래서 피커는 이 계약만 알고, 조합 지점(메일·문자 화면)이 demo 마커 블록 안에서 구현을 주입한다.
 *
 * 이 파일은 어느 pack 에도 속하지 않는다 — 피커와 demo 어댑터가 함께 참조하는 중립 타입이다.
 */

export interface RecipientAddressBook {
  id: number;
  name: string;
}

export interface RecipientAddressBookContact {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
}

export interface RecipientAddressBookSource {
  listBooks(): Promise<RecipientAddressBook[]>;
  listContacts(bookId: number): Promise<RecipientAddressBookContact[]>;
}
