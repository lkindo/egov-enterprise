import { defineContributions } from '@/extensions/slots';

/**
 * 알림 → 전달 채널 기여(GAP-COMPOSE-001). 이 구성에 앱 알림이 있다는 표시다. 결재·메모 보고 화면이 core 도우미로 이것을 묻고,
 * 있을 때만 재알림 단추와 '알립니다' 안내를 보인다. 알림 기능이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워지고 레지스트리가
 * 빈 배열로 다시 만들어진다 — 서버의 재알림 API 는 그대로다(표시만 바뀐다).
 */
export default defineContributions('delivery-channels', [
  {
    id: 'notification',
    visibleWhen: { always: '구성에 알림 기능이 있다는 사실이라 보는 사람마다 다르지 않습니다.' },
  },
]);
