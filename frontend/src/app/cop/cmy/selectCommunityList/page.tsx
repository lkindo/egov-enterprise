import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { communityUserService } from '@/services/business/user/community/CommunityUserService';
import CommunityHubClient from './CommunityHubClient';

export const metadata: Metadata = {
  title: `커뮤니티 목록 | ${SITE_IDENTITY.frameworkName}`,
};



export default async function CommunityListPage() {
  // Fetch initial data on server for better SEO and LCP
  // 클라이언트의 첫 조회와 **같은 파라미터**여야 initialData 가 실제 첫 페이지와 일치한다
  // (서버는 Spring Pageable 의 page/size 를 읽는다 — pageIndex·pageUnit 은 무시된다).
  const initialData = await communityUserService.getCommunityList({ page: 0, size: 10 });

  return <CommunityHubClient initialData={initialData} />;
}
