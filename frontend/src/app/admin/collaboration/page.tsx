import React from 'react';
import CollaborationHubClient from './CollaborationHubClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '협업 매트릭스 | eGov Enterprise',
  description: '조직 내 지식 공유 및 커뮤니케이션을 위한 통합 협업 허브',
};

export default function CollaborationHubPage() {
  return (
    <div className="space-y-6">
      <CollaborationHubClient />
    </div>
  );
}
