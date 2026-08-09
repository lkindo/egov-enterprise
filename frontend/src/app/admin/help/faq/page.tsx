import { Suspense } from 'react';
import KnowledgeHubClient from '../KnowledgeHubClient';

export default function FAQPage() {
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-lg bg-muted" />}>
      <KnowledgeHubClient defaultTab="FAQ" />
    </Suspense>
  );
}
