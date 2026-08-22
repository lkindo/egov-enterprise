import { Suspense } from 'react';
import KnowledgeHubClient from './KnowledgeHubClient';

export default function KnowledgeArchiveHubPage() {
  // 카테고리를 URL(?tab=)에서 파생시키므로 useSearchParams 를 사용한다 → Suspense 경계 필요.
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-lg bg-muted"><h1 className="sr-only">지식 베이스를 불러오는 중</h1></div>}>
      <KnowledgeHubClient />
    </Suspense>
  );
}
