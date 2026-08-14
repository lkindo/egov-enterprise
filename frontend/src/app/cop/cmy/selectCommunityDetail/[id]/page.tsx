import { communityService } from '@/services/business/community/communityService';
import CommunityDetailHubClient from './CommunityDetailHubClient';
import { notFound } from 'next/navigation';



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
  
  try {
    // Fetch initial data on server
    const community = await communityService.getCommunity(cmntySn);
    
    if (!community) {
      return notFound();
    }

    return <CommunityDetailHubClient cmntySn={cmntySn} initialData={community} />;
  } catch (error) {
    console.error('Failed to fetch community detail', error);
    return notFound();
  }
}
