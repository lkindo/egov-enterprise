'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NOTICE_BOARD_ID, TASK_BOARD_ID } from '@/config/board-ids';
import type { DashboardTask } from '@/types/foundation/dashboard';
import { boardHomeQuery } from '@/queries/board-home-query';
import { PostingStatusBadge } from '@/app/admin/community/boards/components/PostingStatusBadge';

/**
 * 업무 홈의 게시판 구역(Phase 2 9단계 — 종전 UnifiedDashboardClient 의 게시판 블록을 줄 단위로 옮겼다). 게시판 기능 소유이고 업무 홈
 * 셸에는 home-sections 기여(extensions/board/home-sections.ts)로 들어간다. 게시판을 고르지 않은 구성에서는 이 파일과 기여가 함께
 * 지워져 업무 홈에 게시판 카드·목록·단추가 없다.
 *
 * 네 조각(글 수 카드 둘·최근 글 목록·새 게시글 작성)이 같은 조회(boardHomeQuery)를 읽는다 — 서버 자식이 미리 채워 첫 화면에 값이
 * 있고, 요청은 한 번이다. 서버가 권한 판정(403)으로 게시판을 주지 않으면(null) 게시판 조각을 그리지 않는다. 조회 실패를 0건으로
 * 위장하지 않는다 — 전송 실패는 서버에서 오류 경계로 가고, 게시판 전체 글 수를 셀 수 없으면 '조회 실패' 라고 말한다(DIP V1).
 */
function useBoardHome() {
  return useQuery(boardHomeQuery);
}

function totalValue(total: number | null | undefined, pending: boolean) {
  if (pending) return '확인 중';
  return total === null || total === undefined ? '조회 실패' : `${total}건`;
}

/*
  [2026-08-29] '배정된 업무'·'신규' 두 표현을 걷었다.
  이 값은 나에게 배정된 것도, 총 건수도 아니다 — BoardDashboardProvider 가 업무게시판 최신 5건을 가져오고, 로그인한 누구에게나 같은
  목록이다. '배정' 을 결정할 담당자 컬럼도 술어도 없다.
  [2026-09-26 DIP V1] 종전 카드는 목록 길이(최근 5건)를 세어 늘 5 이하였다. 게시판의 전체 글 수를 싣고, 조회에 실패하면 0 이 아니라
  '조회 실패' 라고 말한다(결재 대기와 같은 규칙).
*/
export function BoardTaskTotalCard() {
  const home = useBoardHome();
  if (home.data === null) return null;
  return (
    <li className="rounded-md border border-border bg-card px-4 py-3">
      <span className="text-[length:var(--font-size-body)] text-muted-foreground">업무게시판 글</span>
      <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">{totalValue(home.data?.taskListTotal, home.isPending)}</span>
    </li>
  );
}

export function BoardNoticeTotalCard() {
  const home = useBoardHome();
  if (home.data === null) return null;
  return (
    <li className="rounded-md border border-border bg-card px-4 py-3">
      <span className="text-[length:var(--font-size-body)] text-muted-foreground">공지사항</span>
      <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">{totalValue(home.data?.notiListTotal, home.isPending)}</span>
    </li>
  );
}

/*
  [2026-09-12] 종전 목적지 `/admin/community/boards` 는 DEC-OPS-040 이후 지식 허브 커뮤니티 탭으로 보내는 page-redirect 다 — 글쓰기
  버튼이 탭 화면에 떨어졌다. 리다이렉트가 200 을 돌려주므로 아무것도 실패하지 않아 조용했다. 정본 작성 화면으로 직접 보내고, bbsId 를
  싣는다 — 그 화면은 bbsId 가 없으면 공지사항으로 기본값을 잡는데, 업무 홈에서 누른 글쓰기가 공지 방송이 되면 안 된다.
*/
export function BoardNewPostAction() {
  const home = useBoardHome();
  if (home.data === null) return null;
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={`/admin/community/boards/insert-board-article?bbsId=${TASK_BOARD_ID}`}>
        <Plus size={16} aria-hidden="true" /> 새 게시글 작성
      </Link>
    </Button>
  );
}

interface HomeListSectionProps {
  title: string;
  items: DashboardTask[];
  /** 게시판 전체 글 수. null 은 조회 실패 — 빈 목록을 "글이 없다" 로 말하지 않는다(DIP V1). */
  total: number | null;
  moreHref: string;
  moreLabel: string;
  emptyMessage: string;
}

/**
 * 서버가 제공한 게시판·게시글 식별자가 있는 항목만 상세로 연결한다.
 * 식별자가 없는 응답에 임의 목적지를 붙이지 않고 전체 보기로 안내한다.
 */
function HomeListSection({ title, items, total, moreHref, moreLabel, emptyMessage }: HomeListSectionProps) {
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
                {item.bbsId && item.pstSn
                  ? <Link href={`/admin/community/boards/detail?bbsId=${encodeURIComponent(item.bbsId)}&pstSn=${item.pstSn}`} className="underline-offset-4 hover:text-primary hover:underline">{item.title}</Link>
                  : item.title}
                {/* [2026-10-23 ADR-0040 결정 3] 예약·게시 종료 글(작성자에게만 온다)은 서버 판정 표지를 붙인다. */}
                <PostingStatusBadge status={item.postingStatus} startYmd={item.postingStartYmd} />
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
          {total === null ? '목록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.' : emptyMessage}
        </p>
      )}
    </section>
  );
}

export function BoardHomeLists() {
  const home = useBoardHome();
  if (home.data === null) return null;
  if (home.isPending) {
    // 서버 자식이 미리 채우지 못한 첫 화면(드문 경우)에는 목록 자리만 잡는다.
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-md" />
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
    );
  }
  /*
    브라우저 조회가 실패하면(404·429·연결 실패 — 앱 기본값은 4xx 를 다시 보내지 않고 5xx 최초 로드만 오류 경계로 올린다) data 는
    undefined 로 남는다. 자리표시를 계속 그리면 목록이 끝없이 '불러오는 중' 이 되므로, 두 목록 모두 조회 실패 문구로 그린다(total=null).
  */
  const data = home.data;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <HomeListSection
        title="업무게시판 최근 글"
        items={data?.initialTaskList ?? []}
        total={data ? data.taskListTotal : null}
        moreHref={`/admin/community/boards/select-board-list?bbsId=${TASK_BOARD_ID}`}
        moreLabel="업무게시판 전체 보기"
        emptyMessage="업무게시판에 등록된 글이 없습니다."
      />
      <HomeListSection
        title="최근 공지사항"
        items={data?.initialNotiList ?? []}
        total={data ? data.notiListTotal : null}
        moreHref={`/admin/community/boards/select-board-list?bbsId=${NOTICE_BOARD_ID}`}
        moreLabel="공지 전체 보기"
        emptyMessage="새 공지사항이 없습니다."
      />
    </div>
  );
}
