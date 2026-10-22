import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_IDENTITY } from '@/config/site-identity';

/**
 * 콘텐츠 페이지 화면의 기본 문서 제목. 게시본은 page 의 generateMetadata 가 그 페이지 제목으로 덮고, 없거나 게시되지 않은
 * 페이지·조회 오류에서는 이 제목이 남는다 — 어느 경우에도 사이트 이름만 보이지 않는다.
 */
export const metadata: Metadata = {
  title: `콘텐츠 페이지 | ${SITE_IDENTITY.frameworkName}`,
};

export default function ContentPageLayout({ children }: { children: ReactNode }) {
  return children;
}
