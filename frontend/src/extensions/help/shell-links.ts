import { Info, MessageSquare } from 'lucide-react';
import { defineContributions } from '@/extensions/slots';

/**
 * 도움말 → 앱 셸 링크 기여(슬롯 단계 PR-6).
 *
 * 머리글의 도움말 아이콘, 바닥글의 '고객지원', 오류 화면의 '기술 지원 문의하기' 는 모두 도움말 화면(/help)으로 간다. 도움말 기능이
 * 빠진 구성에서는 이 파일이 기능과 함께 직접 지워지고 레지스트리가 빈 배열로 다시 만들어진다 — 셸은 그대로이고 링크만 사라진다.
 *
 * 노출 술어는 목적지 그 자체다({ page: href }). /help 는 /admin 밖이라 페이지 게이트가 없어 늘 참이다 — 실제 보장은 이 파일이 도움말
 * 기능과 함께 지워지는 것이다. 바닥글 항목은 같은 파일의 머리글 항목과 짝을 이룬다 — fill 화면에서 바닥글이 숨어도 머리글로 닿는다.
 */
export default defineContributions('shell-links', [
  {
    id: 'help-header',
    placement: 'header',
    order: 10,
    href: '/help',
    label: '도움말',
    icon: Info,
    visibleWhen: { page: '/help' },
  },
  {
    id: 'help-footer',
    placement: 'footer',
    order: 10,
    href: '/help',
    label: '고객지원',
    visibleWhen: { page: '/help' },
  },
  {
    id: 'help-error',
    placement: 'error',
    order: 10,
    href: '/help',
    label: '기술 지원 문의하기',
    icon: MessageSquare,
    description: '문제가 지속된다면 기술 지원팀에 문의하세요',
    visibleWhen: { page: '/help' },
  },
]);
