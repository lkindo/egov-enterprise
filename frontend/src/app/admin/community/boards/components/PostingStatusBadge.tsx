import { cn } from '@/lib/utils';
import { toDisplayYmd } from '@/lib/format-date';
import type { BoardPostingStatus } from '@/types/business/board';

/*
  [2026-10-23 ADR-0040 결정 3] 게시 상태 표지를 서버 판정(BoardDto.postingStatus)으로 바꿨다. 종전 PostingEndedBadge 는 브라우저
  시간대의 오늘로 종료일을 다시 비교해, 자정 근처와 시간대가 다른 환경에서 서버 판정과 갈렸다(DEC-OPS-140). 이 파일은 오늘을 구하지
  않는다 — 상태가 없으면(통합 검색·공개 FAQ 응답처럼 서버가 싣지 않는 경로) 아무것도 그리지 않는다. [결정 5] 상단 고정 표지도 같은
  원칙으로 서버 판정(BoardDto.pinned)만 그린다.
*/

const SCHEDULED_NOTE = '게시 시작일 전이라 다른 사용자에게는 보이지 않습니다.';
const ENDED_NOTE = '게시 종료일이 지나 다른 사용자에게는 보이지 않습니다.';
const PINNED_NOTE = '게시판 목록 맨 위에 고정한 글입니다.';

const BADGE_CLASS = 'ml-1.5 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 align-middle text-xs font-semibold';

/**
 * 이용 화면의 게시 상태 표지(목록 제목 옆·상세 제목 아래). 예약·게시 종료 글은 서버가 작성자와 조회 대행 권한자(BOARD_READ_ALL)에게만
 * 내려준다. 그래서 이 표지를 보는 사람에게 다른 사용자에게는 보이지 않는다는 사실을 함께 알린다. 게시 중이면 그리지 않는다.
 *
 * @param startYmd 예약 글의 게시 시작일(yyyyMMdd). 언제 공개되는지를 함께 말한다 — 날짜를 비교하지는 않는다.
 */
export function PostingStatusBadge({ status, startYmd }: {
  status?: BoardPostingStatus | null;
  startYmd?: string | null;
}) {
  if (status === 'SCHEDULED') {
    const start = toDisplayYmd(startYmd, '');
    return (
      <span
        className={cn(BADGE_CLASS, 'border border-info/40 bg-info/15 text-foreground')}
        title={start ? `게시 시작일 ${start} 전이라 다른 사용자에게는 보이지 않습니다.` : SCHEDULED_NOTE}
      >
        예약
        {start ? <span className="sr-only"> · 게시 시작일 {start}</span> : null}
      </span>
    );
  }
  if (status === 'ENDED') {
    return (
      <span className={cn(BADGE_CLASS, 'bg-muted text-muted-foreground')} title={ENDED_NOTE}>
        게시 종료
      </span>
    );
  }
  return null;
}

/**
 * 이용 화면의 상단 고정 표지(ADR-0040 결정 5, §5.7 — 공지·필독과 구분해 '상단 고정' 이라 부른다). 기본 정렬에서 이 글이 위에 오는
 * 이유를 말한다. 서버가 지금 고정 중이라고 판정한 글(pinned)에만 붙이고, 고정 종료일을 오늘과 비교하지 않는다(DEC-OPS-140) — 날짜는
 * 언제까지인지 알리는 데만 쓴다.
 *
 * @param endYmd 고정 종료일(yyyyMMdd). 서버는 지금 고정 중일 때만 싣는다.
 */
export function PinnedBadge({ pinned, endYmd }: { pinned?: boolean | null; endYmd?: string | null }) {
  if (pinned !== true) return null;
  const end = toDisplayYmd(endYmd, '');
  return (
    <span
      className={cn(BADGE_CLASS, 'border border-primary/40 bg-primary/10 text-foreground')}
      title={end ? `${end}까지 게시판 목록 맨 위에 고정한 글입니다.` : PINNED_NOTE}
    >
      상단 고정
      {end ? <span className="sr-only"> · {end}까지</span> : null}
    </span>
  );
}

const LABELS: Readonly<Record<BoardPostingStatus, string>> = {
  SCHEDULED: '예약',
  POSTING: '게시 중',
  ENDED: '게시 종료',
};

const DOT_CLASS: Readonly<Record<BoardPostingStatus, string>> = {
  SCHEDULED: 'bg-info',
  POSTING: 'bg-success',
  ENDED: 'bg-muted-foreground',
};

/**
 * 운영 화면 게시물 탭의 게시 상태 칸(설계서 §5.4·§5.7 — 게시 중 / 예약 / 게시 종료). 세 상태를 모두 점과 글자로 그린다 — 색만으로
 * 구분하지 않는다(WCAG 1.4.1). 서버가 상태를 싣지 않았으면 지어내지 않고 '—' 로 둔다.
 */
export function PostingStatusLabel({ status }: { status?: BoardPostingStatus | null }) {
  if (!status || !(status in LABELS)) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-1.5 py-0.5 text-xs text-foreground">
      <span className={cn('size-1.5 rounded-full', DOT_CLASS[status])} aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
