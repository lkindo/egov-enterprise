import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { communityUserService } from '@/services/business/user/community/CommunityUserService';
import CommunityDetailHubClient from './CommunityDetailHubClient';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: `커뮤니티 상세 | ${SITE_IDENTITY.frameworkName}`,
};



export default async function CommunityDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const cmntySn = Number(id);

  if (!Number.isSafeInteger(cmntySn) || cmntySn <= 0) {
    return notFound();
  }
  
  let community;
  try {
    // Fetch initial data on server
    community = await communityUserService.getCommunity(cmntySn);
  } catch (error) {
    console.error('Failed to fetch community detail', error);
    return notFound();
  }

  if (!community) {
    return notFound();
  }

  return <CommunityDetailHubClient cmntySn={cmntySn} initialData={community} />;
}
