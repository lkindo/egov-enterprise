'use client';

import { useEffect, use } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSkeleton } from '@/app/components/dashboard/DashboardSkeleton';
import { DashboardTask } from '@/types/foundation/dashboard';

// Optimization: Priority 2 - Dynamic Imports for heavy components
/* reusable-base:demo:start */
const BannerSlider = dynamic(() => import('@/app/components/dashboard/BannerSlider').then(mod => mod.BannerSlider), {
  loading: () => <Skeleton className="h-[400px] w-full rounded-lg" />,
  ssr: false
});
const PopupManager = dynamic(() => import('@/app/components/dashboard/PopupManager').then(mod => mod.PopupManager), { ssr: false });
/* reusable-base:demo:end */
const ActivityFeed = dynamic(() => import('@/app/components/dashboard/ActivityFeed').then(mod => mod.ActivityFeed), {
  loading: () => <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>,
  ssr: false
});
const RealTimeDashboard = dynamic(() => import('@/components/features/dashboard/RealTimeDashboard').then(mod => mod.RealTimeDashboard), {
  loading: () => <Skeleton className="h-[150px] w-full rounded-lg" />,
  ssr: false
});

interface UnifiedDashboardClientProps {
  dataPromise: Promise<{
    initialNotiList: DashboardTask[];
    initialTaskList: DashboardTask[];
    pendingApprovalCount: number;
  }>;
}

/**
 * 업무 홈 — 포털형 랜딩의 대체.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §3(공통 규칙)·§7 W4.
 *
 * 종전에는 인사말 히어로 → 배너 슬라이더 → 실시간 위젯 → 큰 요약 카드 3장 → 480px 고정 높이
 * 목록 카드 순서라, "내가 지금 처리해야 할 것"이 화면 한참 아래에 있었다. 순서를 뒤집어
 * **처리 대기 → 내 목록 → 상태·활동 → 홍보**로 놓는다.
 *
 * ⚠ 목록 항목은 링크가 아니다 — 대시보드 응답(DashboardTask)에는 항목별 목적지가 없다.
 *   종전 카드는 `cursor-pointer` 로 클릭 가능한 것처럼 보였지만 핸들러가 없었다(G10 죽은 어포던스).
 *   목적지가 있는 것만 링크로 만들고, 나머지는 섹션 단위 '전체 보기'로 보낸다.
 */

interface HomeListSectionProps {
  title: string;
  items: DashboardTask[];
  moreHref: string;
  moreLabel: string;
  emptyMessage: string;
}

function HomeListSection({ title, items, moreHref, moreLabel, emptyMessage }: HomeListSectionProps) {
  const headingId = `home-section-${moreLabel}`;

  return (
    <section aria-labelledby={headingId} className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <h2 id={headingId} className="text-[length:var(--font-size-body)] font-semibold text-foreground">
          {title}
        </h2>
        <Link
          href={moreHref}
          className="text-[length:var(--font-size-body)] text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          {moreLabel}
        </Link>
      </div>
      {items.length > 0 ? (
        <ul className="divide-y divide-border">
          {items.slice(0, 6).map((item, index) => (
            <li key={item.id || `${title}-${index}`} className="flex items-baseline justify-between gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-body)] text-foreground">
                {item.title}
                {item.isNew && (
                  <span className="ml-2 rounded bg-info px-1.5 py-0.5 text-xs font-bold text-info-foreground">신규</span>
                )}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.date || '-'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-[length:var(--font-size-body)] text-muted-foreground">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

export default function UnifiedDashboardClient({
  dataPromise
}: UnifiedDashboardClientProps) {
  const data = use(dataPromise);
  const notiList = data.initialNotiList || [];
  const taskList = data.initialTaskList || [];
  const pendingCount = data.pendingApprovalCount || 0;
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <>
        <h1 className="sr-only">업무 홈을 불러오는 중</h1>
        <DashboardSkeleton />
      </>
    );
  }


  return (
    <div className="space-y-4">
      {/* reusable-base:demo:start */}
      <PopupManager />
      {/* reusable-base:demo:end */}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">업무 홈</h1>
          <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">
            안녕하세요, {user.name}님. 오늘 처리할 업무입니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/community/boards">
              <Plus size={16} aria-hidden="true" /> 새 게시글 작성
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/approvals">결재함 열기</Link>
          </Button>
        </div>
      </header>

      {/* 처리 대기 요약 — 목적지가 있는 항목만 링크한다(G10). */}
      <ul className="grid gap-2 sm:grid-cols-3">
        <li className="rounded-md border border-border bg-card px-4 py-3">
          <Link href="/approvals" className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="text-[length:var(--font-size-body)] text-muted-foreground group-hover:text-primary">결재 대기</span>
            <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">{pendingCount}건</span>
          </Link>
        </li>
        {/*
          [2026-08-29] '배정된 업무'·'신규' 두 표현을 걷는다.
          이 값은 나에게 배정된 것도, 총 건수도 아니다 — BoardDashboardProvider:35 가
          `getBoardPosts(taskId, PageRequest.of(0, 5))` 로 가져오는 **업무게시판 최신 5건**이고,
          로그인한 누구에게나 같은 목록이다. '배정' 을 결정할 담당자 컬럼도 술어도 없다.
          '신규' 는 언제나 0 이다 — dashboard-data.ts:17 이 읽는 `isNew` 를 서버가 만들지 않아
          `Boolean(undefined || false)` 로 떨어진다(전 저장소 grep: 백엔드에 isNew 0건).
        */}
        <li className="rounded-md border border-border bg-card px-4 py-3">
          <span className="text-[length:var(--font-size-body)] text-muted-foreground">업무게시판 최근 글</span>
          <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">{taskList.length}건</span>
        </li>
        <li className="rounded-md border border-border bg-card px-4 py-3">
          <span className="text-[length:var(--font-size-body)] text-muted-foreground">최근 공지</span>
          <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">{notiList.length}건</span>
        </li>
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <HomeListSection
          title="업무게시판 최근 글"
          items={taskList}
          moreHref="/admin/community/boards"
          moreLabel="업무게시판 전체 보기"
          emptyMessage="업무게시판에 등록된 글이 없습니다."
        />
        <HomeListSection
          title="최근 공지사항"
          items={notiList}
          moreHref="/admin/community/boards"
          moreLabel="공지 전체 보기"
          emptyMessage="새 공지사항이 없습니다."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="home-realtime" className="rounded-md border border-border bg-card p-4">
          <h2 id="home-realtime" className="mb-3 text-[length:var(--font-size-body)] font-semibold text-foreground">
            실시간 상태
          </h2>
          <RealTimeDashboard />
        </section>
        <section aria-labelledby="home-activity" className="rounded-md border border-border bg-card p-4">
          <h2 id="home-activity" className="mb-3 text-[length:var(--font-size-body)] font-semibold text-foreground">
            최근 활동
          </h2>
          <ActivityFeed />
        </section>
      </div>

      {/* reusable-base:demo:start */}
      <div className="overflow-hidden rounded-md">
        <BannerSlider />
      </div>
      {/* reusable-base:demo:end */}
    </div>
  );
}
