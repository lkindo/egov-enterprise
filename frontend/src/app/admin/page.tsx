import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import AdminDashboardClient from './AdminDashboardClient';
import { ADMIN_DASHBOARD_QUERY_KEYS, ADMIN_DASHBOARD_QUERY_PERMISSIONS } from './admin-dashboard-queries';
import { auditAdminService } from '@/services/foundation/system/AuditAdminService';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { authorAdminService } from '@/services/foundation/system/AuthorAdminService';
import { adminDashboardService } from '@/services/foundation/system/AdminDashboardService';
import { canPermission } from '@/lib/auth/permissions';
import { getServerUser } from '@/lib/auth/server-user';

export const metadata: Metadata = {
  title: `관리자 대시보드 | ${SITE_IDENTITY.frameworkName}`,
};

/**
 * 관리자 대시보드 메인 페이지 (Server Component)
 *
 * 헌법 제3조(서버 컴포넌트 우선 원칙) 및 제4조 5항(SSR 초기 데이터 하이드레이션 패턴)을 준수합니다.
 * 서버 사이드에서 주요 데이터(최근 실패 요청, 사용자 목록, 권한 그룹 목록, 운영 신호)를 병렬 프리페치하여
 * 클라이언트 컴포넌트 마운트 시의 로딩 스피너/깜빡임을 예방하고 LCP 성능을 극대화합니다.
 *
 * [2026-10-20] 보는 사람에게 그 조회 API 의 권한이 있을 때만 미리 채운다 — 화면이 그리지 않을 카드의 데이터를 부르지 않는다
 * (권한이 없으면 서버가 403 을 돌려줄 조회다). 실패는 삼키고 화면이 그 카드에서 말한다.
 */
export default async function AdminDashboardPage() {
  const queryClient = new QueryClient();
  const user = await getServerUser();
  const allowed = (query: keyof typeof ADMIN_DASHBOARD_QUERY_PERMISSIONS) => canPermission(user, ADMIN_DASHBOARD_QUERY_PERMISSIONS[query]);

  // 병렬 API 프리페치로 초기 데이터 적재
  await Promise.allSettled([
    allowed('recentFailedRequests') && queryClient.prefetchQuery({
      queryKey: ADMIN_DASHBOARD_QUERY_KEYS.recentFailedRequests,
      queryFn: () => auditAdminService.getAuditLogs({ page: 1, size: 5 }),
    }),
    allowed('users') && queryClient.prefetchQuery({
      queryKey: ADMIN_DASHBOARD_QUERY_KEYS.users,
      queryFn: () => userAdminService.getUserList({ page: 1, size: 1 }),
    }),
    allowed('authors') && queryClient.prefetchQuery({
      queryKey: ADMIN_DASHBOARD_QUERY_KEYS.authors,
      queryFn: () => authorAdminService.getAuthorList({ page: 1, size: 1 }),
    }),
    allowed('operationalSignals') && queryClient.prefetchQuery({
      queryKey: ADMIN_DASHBOARD_QUERY_KEYS.operationalSignals,
      queryFn: () => adminDashboardService.getOperationalSignals(),
    }),
  ]);

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <AdminDashboardClient />
    </HydrationBoundary>
  );
}
