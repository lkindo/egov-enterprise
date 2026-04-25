import React from 'react';
import { communityService } from '@/services/business/community/communityService';
import CommunityHubClient from './CommunityHubClient';

export const dynamic = 'force-dynamic';

export default async function CommunityListPage() {
  // Fetch initial data on server for better SEO and LCP
  const initialData = await communityService.getCommunityList({ page: 1, pageUnit: 10 });

  return <CommunityHubClient initialData={initialData} />;
}
