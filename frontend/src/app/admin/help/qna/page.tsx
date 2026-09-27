import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { Suspense } from 'react';
import KnowledgeHubClient from '../KnowledgeHubClient';

export const metadata: Metadata = {
  title: `질문과 답변 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default function QNAPage() {
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-lg bg-muted"><h1 className="sr-only">질문과 답변을 불러오는 중</h1></div>}>
      <KnowledgeHubClient defaultTab="QNA" />
    </Suspense>
  );
}
