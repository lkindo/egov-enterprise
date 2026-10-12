import { Users } from 'lucide-react';
import { defineContributions } from '@/extensions/slots';

/**
 * 쪽지 → 명령 센터 바로가기 기여(허브 분해 H1). 협업 허브의 기본 탭이 쪽지라 쪽지가 바로가기를 소유한다 — 쪽지가 빠진 구성에서는
 * 바로가기만 사라진다(스크랩만 고른 구성은 '내 스크랩' 메뉴로 허브에 닿는다). 허브에는 메일 탭이 없으므로 설명에 메일을 쓰지 않는다.
 */
export default defineContributions('shell-links', [
  {
    id: 'collaboration-hub',
    placement: 'command-center',
    order: 10,
    href: '/admin/collaboration',
    label: '협업 통합 허브',
    icon: Users,
    description: '받은 쪽지 등 협업 목록으로 이동',
    visibleWhen: { page: '/admin/collaboration' },
  },
]);
