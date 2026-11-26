import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_IDENTITY } from '@/config/site-identity';

/**
 * 로그인의 기본 문서 제목(한국어 정본). page 의 generateMetadata 가 화면 로케일 제목으로 덮는다(ADR-0063) — 화면 용어 계약은 정적 제목을
 * 읽으므로 한국어 정본을 여기에 둔다(게시판 이용 목록과 같은 짜임).
 */
export const metadata: Metadata = {
  title: `로그인 | ${SITE_IDENTITY.frameworkName}`,
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
