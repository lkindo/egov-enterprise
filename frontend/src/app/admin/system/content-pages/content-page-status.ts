import type { CmsPageStatus } from '@/services/business/cms/CmsService';

/**
 * 콘텐츠 페이지 상태의 화면 이름(ADR-0042). 목록 배지·필터와 편집기 머리가 같은 이름을 쓴다.
 *
 * 초안은 한 번도 게시하지 않은 페이지만 뜻한다. 게시한 적이 있지만 지금은 내린 페이지는 '게시 중지' 다 — 주소가 고정돼 있고
 * 그 주소로 가는 메뉴가 남아 있을 수 있어, 처음 쓰는 초안과 가려 봐야 한다.
 */
export const STATUS_LABELS: Record<CmsPageStatus, string> = {
  DRAFT: '초안',
  PUBLISHED: '게시 중',
  UNPUBLISHED: '게시 중지',
  ARCHIVED: '보관',
};

export function statusLabel(status: string | null | undefined): string {
  return STATUS_LABELS[(status ?? 'DRAFT') as CmsPageStatus] ?? STATUS_LABELS.DRAFT;
}
