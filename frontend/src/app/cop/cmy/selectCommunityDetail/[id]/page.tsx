import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { communityUserService } from '@/services/business/user/community/CommunityUserService';
import CommunityDetailHubClient from './CommunityDetailHubClient';
import { notFound } from 'next/navigation';
import { logErrorSafely } from '@/lib/safe-error-log';

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
    // 원본 오류를 넘기지 않는다 — 서버 요청의 config.headers 에 실린 Authorization(Bearer) 이 서버 로그에 그대로 찍혔다.
    logErrorSafely('Failed to fetch community detail', error);
    return notFound();
  }

  if (!community) {
    return notFound();
  }

  return <CommunityDetailHubClient cmntySn={cmntySn} initialData={community} />;
}
