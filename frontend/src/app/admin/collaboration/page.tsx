import React from 'react';
import CollaborationHubClient from './CollaborationHubClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '협업 매트릭스 | eGov Enterprise',
  description: '조직 내 지식 공유 및 커뮤니케이션을 위한 통합 협업 허브',
};

export default function CollaborationHubPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const resolvedSearchParams = React.use(searchParams);
  const tab = resolvedSearchParams.tab?.toUpperCase() as any;
  
  return (
    <div className="space-y-6">
      <CollaborationHubClient defaultTab={tab || 'MESSAGES'} />
    </div>
  );
}
