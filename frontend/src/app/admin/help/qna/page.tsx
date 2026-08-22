import { Suspense } from 'react';
import KnowledgeHubClient from '../KnowledgeHubClient';

export default function QNAPage() {
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-lg bg-muted"><h1 className="sr-only">질문과 답변을 불러오는 중</h1></div>}>
      <KnowledgeHubClient defaultTab="QNA" />
    </Suspense>
  );
}
