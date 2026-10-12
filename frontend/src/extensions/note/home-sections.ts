import { defineContributions } from '@/extensions/slots';
import { UnreadNotesCard } from '@/app/components/dashboard/UnreadNotesCard';

/**
 * 쪽지 → 업무 홈 기여(Phase 2 9단계). 안 읽은 쪽지 카드다. 쪽지가 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져 이 카드만 사라진다.
 * 노출은 카드가 부르는 미읽음 수 API 와 같은 권한(NOTE_READ)이다 — 카드 안의 판정과 같은 술어다. 수는 지금처럼 브라우저가 센다.
 */
export default defineContributions('home-sections', [
  {
    id: 'unread-notes',
    placement: 'cards',
    order: 20,
    Component: UnreadNotesCard,
    visibleWhen: { permissions: ['NOTE_READ'] },
  },
]);
