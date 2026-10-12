import { Plus } from 'lucide-react';
import { defineContributions } from '@/extensions/slots';

/**
 * 메일 → 협업 허브 머리 링크 기여(허브 분해 H1). 종전에는 쪽지 탭의 주 동작이 메일 발송 화면으로 가는 문자열 링크라, 메일 없이 쪽지만
 * 고른 생성물에서 404 로 갔다(GAP-COMPOSE-001). 이제 메일 기능이 빠지면 이 파일과 함께 링크가 사라진다. 이름은 메일 이력 화면과 같다.
 */
export default defineContributions('shell-links', [
  {
    id: 'mail-compose',
    placement: 'collaboration-hub',
    order: 20,
    href: '/admin/collaboration/mail-send',
    label: '신규 발송',
    icon: Plus,
    visibleWhen: { page: '/admin/collaboration/mail-send' },
  },
]);
