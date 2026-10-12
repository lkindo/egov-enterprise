import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { dehydrate, HydrationBoundary, QueryClient, type FetchQueryOptions } from '@tanstack/react-query';
import { homeSections } from '@/extensions/generated-home-sections';
import { visibleEntries, type HomePrefetch } from '@/extensions/slots';
import { getServerUser } from '@/lib/auth/server-user';
import { homeAccessDenied } from './home-access';

/**
 * 업무 홈 서버 자식(Phase 2 9단계). page 의 Suspense 안에서 기여(home-sections)가 적은 조회를 서버에서 미리 채워 첫 화면에 데이터를
 * 싣는다. page 본문은 searchParams 만 기다리고 이 자식을 기다리지 않는다 — 그래야 업무 홈 대기 동안 루트 전체화면 덮개가 아니라
 * 업무 홈 자리표시(Suspense fallback)가 보이고 권한 부족 안내가 먼저 그려진다.
 *
 * - 미리 채울 조회가 등록되지 않은 구성(core 프리셋)은 서버 일을 하지 않는다.
 * - DASHBOARD_READ 가 없으면(셸이 접근 불가를 알린다) 미리 채우지 않는다 — 보이지 않을 데이터를 부르지 않는다.
 * - 보이는 기여의 조회만, 같은 키는 한 번 부른다. failure 가 boundary 인 조회는 fetchQuery 로 실패를 다시 던져 서버에서 라우트
 *   오류 경계로 보낸다(종전 대시보드 조회와 같다). section 은 삼키고 그 구역이 스스로 실패를 말한다.
 */
export async function HomeDataBoundary({ children }: { children: ReactNode }) {
  const registered = homeSections.some(entries => entries.length > 0);
  if (!homeSections.some(entries => entries.some(entry => entry.prefetch?.length))) return <>{children}</>;
  if (!(await cookies()).get('accessToken')?.value) redirect('/login');
  const user = await getServerUser();
  if (homeAccessDenied(user, registered)) return <>{children}</>;

  const queries = new Map<string, HomePrefetch>();
  for (const prefetch of visibleEntries(user, homeSections).flatMap(entry => entry.prefetch ?? [])) {
    const key = JSON.stringify(prefetch.query.queryKey);
    if (queries.get(key)?.failure !== 'boundary') queries.set(key, prefetch);
  }
  // 서버에서는 다시 보내지 않는다 — 실패는 곧바로 오류 경계나 그 구역의 실패 표시로 간다.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // 기여의 조회는 기능 소유 queryOptions 값이다(slots.ts HomePrefetch — 키와 조회 함수만 타입으로 받는다).
  await Promise.all([...queries.values()].map(({ query, failure }) => (failure === 'boundary'
    ? queryClient.fetchQuery(query as FetchQueryOptions) : queryClient.prefetchQuery(query as FetchQueryOptions))));
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
