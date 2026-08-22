import { Suspense } from 'react';
import KnowledgeHubClient from '../KnowledgeHubClient';

export default function FAQPage() {
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-lg bg-muted"><h1 className="sr-only">자주 묻는 질문을 불러오는 중</h1></div>}>
      <KnowledgeHubClient defaultTab="FAQ" />
    </Suspense>
  );
}
