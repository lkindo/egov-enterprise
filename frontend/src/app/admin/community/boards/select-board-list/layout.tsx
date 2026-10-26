import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_IDENTITY } from '@/config/site-identity';

/**
 * 게시판 이용 목록의 기본 문서 제목(ADR-0043 UX-15). 게시판 이름을 받으면 page 의 generateMetadata 가 '게시판 이름 | 사이트 이름' 으로
 * 덮고, 이름을 받지 못하면 이 제목이 남는다 — 어느 경우에도 사이트 이름만 보이지 않는다(콘텐츠 페이지와 같은 짜임).
 */
export const metadata: Metadata = {
  title: `게시판 | ${SITE_IDENTITY.frameworkName}`,
};

export default function BoardListLayout({ children }: { children: ReactNode }) {
  return children;
}
