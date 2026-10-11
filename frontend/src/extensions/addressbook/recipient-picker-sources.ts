import { defineContributions } from '@/extensions/slots';
import { recipientAddressBookSource } from '@/services/business/user/addressbook/recipient-address-book-source';

/**
 * 주소록 → 수신자 피커 출처 기여(슬롯 단계 PR-4).
 *
 * 메일·문자 작성 화면이 이 출처를 레지스트리에서 받는다. 주소록 기능이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워지고
 * 레지스트리가 빈 배열로 다시 만들어진다 — 피커는 사용자·부서 검색과 직접 입력만 보인다. 쪽지·알림 발송은 이 출처를 쓰지 않는다.
 *
 * 노출은 주소록 조회 권한(ADBK_READ)이 있는 사람에게만 한다(PR-5). 출처가 부르는 주소록 목록·단건 API 가 같은 권한을 요구해, 권한 없는
 * 사용자에게 탭을 보이면 열 때마다 403 이었다. 노출일 뿐 인가가 아니다 — 서버 권한은 그대로 집행된다(H3).
 */
export default defineContributions('recipient-picker-sources', [
  {
    id: 'address-book',
    label: '주소록',
    channels: ['mail', 'sms'],
    source: recipientAddressBookSource,
    visibleWhen: { permissions: ['ADBK_READ'] },
  },
]);
