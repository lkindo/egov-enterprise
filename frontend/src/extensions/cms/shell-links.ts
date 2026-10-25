import { BookOpen } from 'lucide-react';
import { defineContributions } from '@/extensions/slots';

/**
 * 콘텐츠 페이지 → 앱 셸 링크 기여(ADR-0042). 바닥글의 '안내 페이지' 는 게시된 콘텐츠 페이지 목록(/pages)으로 간다 — 메뉴에 걸지 않은
 * 페이지도 여기서 닿는다. 콘텐츠 페이지 기능이 빠진 구성에서는 이 파일이 기능과 함께 지워져 링크만 사라지고 셸은 그대로다.
 *
 * 노출 술어는 목적지 그 자체다({ page: href }). /pages 는 /admin 밖이라 페이지 게이트가 없어 늘 참이다(목록 조회는 로그인만 요구한다).
 * 바닥글 항목은 같은 기여 안에 같은 목적지의 머리글 짝을 둔다(경계 계약) — 바닥글을 숨기는 꽉 찬 화면에서도 머리글 아이콘으로 닿는다.
 * 순서는 도움말(10) 뒤다.
 */
export default defineContributions('shell-links', [
  {
    id: 'cms-pages-header',
    placement: 'header',
    order: 20,
    href: '/pages',
    label: '안내 페이지',
    icon: BookOpen,
    visibleWhen: { page: '/pages' },
  },
  {
    id: 'cms-pages-footer',
    placement: 'footer',
    order: 20,
    href: '/pages',
    label: '안내 페이지',
    visibleWhen: { page: '/pages' },
  },
]);
