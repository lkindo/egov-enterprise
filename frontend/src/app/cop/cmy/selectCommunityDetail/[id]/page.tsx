import React from 'react';
import { communityService } from '@/services/business/community/communityService';
import CommunityDetailHubClient from './CommunityDetailHubClient';
import { notFound } from 'next/navigation';



export default async function CommunityDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;

  // 데이터 조회만 try/catch 로 감싸고, JSX 반환은 밖으로 뺀다.
  // (JSX 를 try 안에서 반환하면 자식 렌더 중 발생한 에러는 여기서 잡히지 않는데도
  //  잡히는 것처럼 보인다 — React 는 반환 시점에 즉시 렌더하지 않기 때문.)
  let community;
  try {
    community = await communityService.getCommunity(id);
  } catch (error) {
    console.error('Failed to fetch community detail', error);
    return notFound();
  }

  if (!community) {
    return notFound();
  }

  return <CommunityDetailHubClient id={id} initialData={community} />;
}
