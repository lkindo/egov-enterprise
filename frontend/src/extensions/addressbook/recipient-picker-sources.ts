import { defineContributions } from '@/extensions/slots';
import { recipientAddressBookSource } from '@/services/business/user/addressbook/recipient-address-book-source';

/**
 * 주소록 → 수신자 피커 출처 기여(슬롯 단계 PR-4).
 *
 * 메일·문자 작성 화면이 이 출처를 레지스트리에서 받는다. 주소록 기능이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워지고
 * 레지스트리가 빈 배열로 다시 만들어진다 — 피커는 사용자·부서 검색과 직접 입력만 보인다. 쪽지·알림 발송은 이 출처를 쓰지 않는다.
 *
 * 노출은 종전과 정확히 같게 둔다(늘 보임). 목록 API 는 서버가 ADBK_READ 로 막으므로, 권한 없는 사용자는 탭을 열면 403 을 본다.
 * 노출을 그 권한에 묶는 일은 따로 한다(PR-5).
 */
export default defineContributions('recipient-picker-sources', [
  {
    id: 'address-book',
    label: '주소록',
    channels: ['mail', 'sms'],
    source: recipientAddressBookSource,
    visibleWhen: { always: '종전 노출을 그대로 둔다 — 목록 API 는 서버가 ADBK_READ 로 막는다.' },
  },
]);
