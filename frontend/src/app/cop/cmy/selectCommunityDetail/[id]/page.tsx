import React from 'react';
import { communityService } from '@/services/business/community/communityService';
import CommunityDetailHubClient from './CommunityDetailHubClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CommunityDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  
  try {
    // Fetch initial data on server
    const community = await communityService.getCommunity(id);
    
    if (!community) {
      return notFound();
    }

    return <CommunityDetailHubClient id={id} initialData={community} />;
  } catch (error) {
    console.error('Failed to fetch community detail', error);
    return notFound();
  }
}
