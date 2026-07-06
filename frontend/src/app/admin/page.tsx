import React from 'react';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import AdminDashboardClient from './AdminDashboardClient';
import { auditAdminService } from '@/services/foundation/system/AuditAdminService';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { authorAdminService } from '@/services/foundation/system/AuthorAdminService';

/**
 * 관리자 인텔리전스 센터 대시보드 메인 페이지 (Server Component)
 * 
 * 헌법 제3조(서버 컴포넌트 우선 원칙) 및 제4조 5항(SSR 초기 데이터 하이드레이션 패턴)을 준수합니다.
 * 서버 사이드에서 주요 데이터(보안 감사 이력, 사용자 목록, 권한 그룹 목록)를 병렬 프리페치하여
 * 클라이언트 컴포넌트 마운트 시의 로딩 스피너/깜빡임을 예방하고 LCP 성능을 극대화합니다.
 */
export default async function AdminDashboardPage() {
  const queryClient = new QueryClient();

  // 병렬 API 프리페치로 초기 데이터 적재
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ['admin-dashboard-recent-audits'],
      queryFn: () => auditAdminService.getAuditLogs({ page: 0, size: 5 }),
    }),
    queryClient.prefetchQuery({
      queryKey: ['admin-dashboard-users'],
      queryFn: () => userAdminService.getUserList({ pageNo: 1, size: 1 }),
    }),
    queryClient.prefetchQuery({
      queryKey: ['admin-dashboard-authors'],
      queryFn: () => authorAdminService.getAuthorList({ pageIndex: 1, size: 1 }),
    }),
  ]);

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <AdminDashboardClient />
    </HydrationBoundary>
  );
}
