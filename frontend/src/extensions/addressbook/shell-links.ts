import { defineContributions } from '@/extensions/slots';

/**
 * 주소록 → 협업 허브 머리 링크 기여(허브 분해 H1). 주소록 기능이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져 링크만 사라진다
 * (종전에는 허브 안의 pack 마커 블록이었다).
 */
export default defineContributions('shell-links', [
  {
    id: 'address-book-manage',
    placement: 'collaboration-hub',
    order: 10,
    href: '/admin/collaboration/address-book/select-address-book-list',
    label: '주소록 관리',
    visibleWhen: { page: '/admin/collaboration/address-book/select-address-book-list' },
  },
]);
