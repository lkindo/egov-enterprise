'use client';

/**
 * 게시판 표시 템플릿 7종.
 *
 * 게시판마다 `tmpltId` 로 고르는 표현이며, **각 템플릿의 구조적 정체성(대표글 강조·2열 카드·
 * 질문 상태·월 달력·아코디언·문서 행·표)은 제품 설계라 유지한다.** [2026-09-20] 업무 화면
 * 문법(docs/02-architecture/work-screen-grammar-catalog.md §3·§4)에 어긋나는 **장식만** 걷었다.
 *
 * 걷은 것과 이유
 *   - 진입 애니메이션(framer-motion `staggerChildren` + spring): 첫 글 도달을 지연시킨다(§3).
 *     목록이 20건이면 마지막 카드까지 2초가 걸렸다.
 *   - 한국어 라벨의 `uppercase tracking-[0.3~0.4em]`: §3 금지. 한국어에 대문자 변환은 효과가
 *     없고 넓은 자간만 남아 가로 공간을 먹는다.
 *   - 반투명 흰색 표면과 팔레트 리터럴(그라데이션·상태색) 하드코딩: 다크 모드에서 깨진다.
 *     ⚠ 색 가드는 **주석을 포함한 원문**을 세므로 여기에 그 클래스 이름을 적지 않는다.
 *   - 워터마크 아이콘(opacity-0.02~0.03), 블러 오브(`blur-[120px] animate-pulse`), 회전·확대 hover.
 *
 * 고친 사실 두 가지
 *   - 갤러리의 288px 이미지 영역은 **채울 데이터가 없었다** — `BoardPost` 에 썸네일 필드가 없어
 *     모든 글이 같은 아이콘과 그라데이션을 보여 주는 영구 플레이스홀더였다. 갤러리인 척하는 대신
 *     실제로 아는 사실(첨부 수)을 말한다.
 *   - 날짜가 `2026.09.20` 처럼 점 구분이었다. 시스템 표준은 `yyyy-MM-dd` 다(DEC-OPS-100).
 *
 * ⚠ e2e(03-board-community)가 각 글을 `a[href*="pstSn="]` + 제목 텍스트로 찾는다 — 제목을 감싸는
 *   `Link` 와 그 href 형태를 바꾸지 않는다.
 *
 * [2026-10-26 ADR-0043 1차 UX-02·03·14] 일곱 템플릿 모두 글 상태 표지(비밀글·상단 고정·예약·게시 종료)를 같은 묶음(PostStateBadges)
 *   으로 보인다. 종전에는 허브형·캘린더·FAQ 가 표지를 그리지 않았고, 나머지는 표지를 제목 링크 안(잘림 영역)에 넣어 긴 제목에서
 *   표지가 잘렸다. 표지는 링크 밖, 잘림 영역 밖에 둔다. 값은 서버 판정만 읽는다(DEC-OPS-140 — 날짜를 다시 계산하지 않는다).
 */
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { BoardPost } from '@/types/business/board';
import { HighlightText } from './HighlightText';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  BookOpen, Clock, Eye, MessageSquare, ChevronRight, ThumbsUp,
  HelpCircle, CheckCircle2, ChevronDown, Paperclip, Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { BoardPostingStatus } from '@/types/business/board';
import { PinnedBadge, PostingStatusBadge } from '../../components/PostingStatusBadge';
import { QNA_STATUS_LABELS, isQnaSolved, qnaCategoryLabel } from '@/lib/board/qna-status';

const SanitizedFaqAnswer = dynamic(() => import('./SanitizedFaqAnswer'), {
  ssr: false,
  loading: () => (
    <p className="text-[length:var(--font-size-body)] text-muted-foreground" role="status">
      답변을 불러오는 중입니다.
    </p>
  ),
});

interface TemplateProps {
  list: BoardPost[];
  bbsId: string;
  querySearchWrd: string;
  handleLike: (e: React.MouseEvent, pstSn: number) => void;
  pendingLikePstSn: number | null;
  /**
   * 추천 단추를 열지(ADR-0040 결정 6). 호출부(BoardListClient)가 추천 권한(BOARD_LIKE)·게시판 사용·추천 받기로 판정한다. 거짓이면
   * 수만 보인다. 기본값을 두지 않는다 — 판정을 빠뜨린 호출부가 권한 없는 사람에게 단추를 열지 않게 타입으로 요구한다.
   */
  likesOpen: boolean;
  page?: number;
  totalCount?: number;
}

/** 저장 값은 `yyyy-MM-dd…` 이므로 앞 10자리가 곧 표시 형식이다. 점 구분으로 바꾸지 않는다. */
const toDisplayDate = (value: string | undefined) =>
  (value ? String(value).substring(0, 10) : '-');

const detailHref = (bbsId: string, pstSn: number) =>
  `/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`;

/** 글 상태 표지가 읽는 서버 값. 게시판 목록 응답(BoardDto)과 지식 허브 목록이 같은 이름으로 싣는다. */
export interface PostStateFields {
  scrtYn?: string | null;
  pinned?: boolean | null;
  upendFixEndYmd?: string | null;
  postingStatus?: BoardPostingStatus | null;
  pstBgngYmd?: string | null;
}

/**
 * 비밀글 표지(UX-03). 열람 범위가 다른 글을 같은 모양으로 보이지 않는다 — 아이콘과 글자가 함께 말하고(WCAG 1.4.1), 누가 볼 수 있는지는
 * 마우스 올림이 아니라 화면낭독기 문장으로 전한다(UX-14). 서버 값(scrtYn)만 읽는다.
 */
export function SecretBadge({ secret }: { secret: boolean }) {
  if (!secret) return null;
  return (
    <span className="ml-1.5 inline-flex shrink-0 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 align-middle text-xs font-semibold text-foreground">
      <Lock size={12} aria-hidden="true" />
      비밀글
      <span className="sr-only"> · 작성자와 관리자만 볼 수 있습니다</span>
    </span>
  );
}

/** 표지가 하나라도 그려지는지. 아래 묶음이 그리는 조건과 같다 — 빈 묶음이 자리(줄)만 차지하지 않게 한다. */
export const hasPostState = (item: PostStateFields): boolean =>
  item.scrtYn === 'Y' || item.pinned === true || item.postingStatus === 'SCHEDULED' || item.postingStatus === 'ENDED';

/**
 * 글 상태 표지 묶음 — 비밀글·상단 고정·예약·게시 종료. 제목 링크 밖, 잘림 영역 밖에 둔다(UX-14). 지식 허브 목록도 같은 묶음을 쓴다.
 * 게시 상태와 고정은 서버 판정(postingStatus·pinned)만 그리고 날짜로 다시 계산하지 않는다(DEC-OPS-140).
 */
export function PostStateBadges({ item, className }: { item: PostStateFields; className?: string }) {
  if (!hasPostState(item)) return null;
  return (
    <span className={cn('inline-flex shrink-0 flex-wrap items-center gap-y-1', className)}>
      <SecretBadge secret={item.scrtYn === 'Y'} />
      <PinnedBadge pinned={item.pinned} endYmd={item.upendFixEndYmd} />
      <PostingStatusBadge status={item.postingStatus} startYmd={item.pstBgngYmd} />
    </span>
  );
}

/** 목록 카드·행이 공유하는 메타 한 줄. 라벨은 아이콘이 아니라 글로도 읽힌다. */
function PostMeta({ item }: { item: BoardPost }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Clock size={12} aria-hidden="true" />
        <span className="tabular-nums">{toDisplayDate(item.crtDt)}</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <Eye size={12} aria-hidden="true" />
        조회 <span className="tabular-nums">{(item.inqCnt || 0).toLocaleString()}</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <MessageSquare size={12} aria-hidden="true" />
        댓글 <span className="tabular-nums">{item.commentCnt ?? 0}</span>
      </span>
    </div>
  );
}

/**
 * 추천 버튼. 동기 잠금과 진행 표시는 호출부(BoardListClient)가 소유한다.
 * [2026-10-23 ADR-0040 결정 6] 추천이 닫혀 있으면(likesOpen 거짓) 단추 대신 쌓인 수만 보인다. 목록은 토글하지 않는다 — 추천 취소는
 * 상세 화면에서 한다.
 */
function LikeButton({
  item,
  handleLike,
  pendingLikePstSn,
  likesOpen,
}: Pick<TemplateProps, 'handleLike' | 'pendingLikePstSn' | 'likesOpen'> & { item: BoardPost }) {
  if (!likesOpen) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ThumbsUp size={14} aria-hidden="true" />
        추천 <span className="tabular-nums">{item.likeCnt || 0}</span>
      </span>
    );
  }
  const pending = pendingLikePstSn === item.pstSn;
  // [2026-10-01] 이미 추천한 글은 '추천함' 으로 보이고 다시 누르지 않는다(서버 판정 recommended).
  const recommended = item.recommended === true;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={(e) => handleLike(e, item.pstSn)}
      disabled={pendingLikePstSn !== null || recommended}
      aria-busy={pending || undefined}
      aria-pressed={recommended}
      aria-label={`${item.pstTtl} ${pending ? '추천 처리 중' : recommended ? '추천함' : '추천'}`}
      className="gap-1.5"
    >
      <ThumbsUp size={14} aria-hidden="true" />
      {recommended && <span>추천함</span>}
      <span className="tabular-nums">{pending ? '처리 중…' : item.likeCnt || 0}</span>
    </Button>
  );
}

export const HubTemplate = ({ list, bbsId, querySearchWrd, page = 1 }: TemplateProps) => {
  if (list.length === 0) return null;
  const [lead, ...rest] = list;
  const cards = page === 1 ? rest : list;

  return (
    <div className="space-y-3 p-[var(--filter-pad)]">
      {page === 1 && (
        /* 대표 글 강조는 이 템플릿의 정체성이라 남긴다 — 다만 히어로가 아니라 강조된 한 행이다. */
        <article className="rounded-md border border-primary/30 bg-primary/5 p-[var(--filter-pad)]">
          <Badge variant="secondary" className="mb-2">대표 게시글</Badge>
          <h3 className="text-base font-semibold text-foreground">
            <Link href={detailHref(bbsId, lead.pstSn)} className="hover:text-primary hover:underline">
              <HighlightText text={lead.pstTtl} highlight={querySearchWrd} />
            </Link>
            <PostStateBadges item={lead} />
          </h3>
          <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">
            {lead.userNm}
          </p>
          <div className="mt-2">
            <PostMeta item={lead} />
          </div>
        </article>
      )}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((item) => (
          <article key={item.pstSn} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
            {/* 표지는 두 줄로 줄이는 제목 밖, 제목 위 한 줄에 둔다(UX-14) — 긴 제목이 표지를 가리지 않는다. */}
            <PostStateBadges item={item} className="-ml-1.5" />
            <h4 className="text-[length:var(--font-size-body)] font-semibold text-foreground">
              <Link href={detailHref(bbsId, item.pstSn)} className="line-clamp-2 hover:text-primary hover:underline">
                <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
              </Link>
            </h4>
            <p className="text-xs text-muted-foreground">{item.userNm}</p>
            <div className="mt-auto">
              <PostMeta item={item} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export const GalleryTemplate = ({ list, bbsId, querySearchWrd, handleLike, pendingLikePstSn, likesOpen }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2 p-[var(--filter-pad)] md:grid-cols-2 xl:grid-cols-3">
      {list.map((item) => {
        const attachments = item.fileCnt ?? 0;
        return (
          <article key={item.pstSn} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <Badge variant="secondary" className="shrink-0">갤러리</Badge>
              {/*
                ⚠ 종전에는 여기가 288px 높이의 이미지 자리였는데 목록 응답에 썸네일이 없어
                  모든 글이 같은 아이콘을 보여 줬다. 아는 사실(첨부 수)만 말한다.
              */}
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Paperclip size={12} aria-hidden="true" />
                {attachments > 0 ? <>첨부 <span className="tabular-nums">{attachments}</span></> : '첨부 없음'}
              </span>
            </div>
            <PostStateBadges item={item} className="-ml-1.5" />
            <h3 className="text-[length:var(--font-size-body)] font-semibold text-foreground">
              <Link href={detailHref(bbsId, item.pstSn)} className="line-clamp-2 hover:text-primary hover:underline">
                <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
              </Link>
            </h3>
            <p className="text-xs text-muted-foreground">
              <HighlightText text={item.userNm} highlight={querySearchWrd} />
            </p>
            <div className="mt-auto flex items-end justify-between gap-2">
              <PostMeta item={item} />
              <LikeButton item={item} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} likesOpen={likesOpen} />
            </div>
          </article>
        );
      })}
    </div>
  );
};

export const QnaTemplate = ({ list, bbsId, querySearchWrd, handleLike, pendingLikePstSn, likesOpen }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-card">
      {list.map((item) => {
        const solved = isQnaSolved(item.qnaSttsCd);
        return (
          <li key={item.pstSn} className="flex flex-wrap items-start gap-3 p-3">
            {/* 상태는 색만으로 전달하지 않는다 — 아이콘과 글자가 함께 말한다(WCAG 1.4.1). */}
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium text-foreground',
                solved ? 'border-success/40 bg-success/15' : 'border-warning/40 bg-warning/15',
              )}
            >
              {solved
                ? <CheckCircle2 size={14} aria-hidden="true" />
                : <HelpCircle size={14} aria-hidden="true" />}
              {solved ? QNA_STATUS_LABELS.SOLVED : QNA_STATUS_LABELS.OPEN}
            </span>

            <div className="min-w-0 flex-1 space-y-1">
              <h4 className="text-[length:var(--font-size-body)] font-semibold text-foreground">
                <Link href={detailHref(bbsId, item.pstSn)} className="hover:text-primary hover:underline">
                  <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
                </Link>
                <PostStateBadges item={item} />
              </h4>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {/* [2026-10-26 ADR-0043 UX-15·16] 분류 이름은 상세와 같은 정본(qna-status)에서 읽는다 — 정의된 이름이 없는 코드는 내보이지 않는다. */}
                <span>분류 {qnaCategoryLabel(item.qnaCatCd)}</span>
                <span>
                  <HighlightText text={item.userNm} highlight={querySearchWrd} />
                </span>
                <span className="tabular-nums">{toDisplayDate(item.crtDt)}</span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare size={12} aria-hidden="true" />
                  답변 <span className="tabular-nums">{item.commentCnt || 0}</span>
                </span>
              </div>
            </div>

            <LikeButton item={item} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} likesOpen={likesOpen} />
          </li>
        );
      })}
    </ul>
  );
};

interface CalendarTemplateProps extends TemplateProps {
  currentViewDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const CalendarTemplate = ({ list, bbsId, currentViewDate, onPrevMonth, onNextMonth, totalCount = 0 }: CalendarTemplateProps) => {
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const postsByDay = list.reduce((acc: { [key: number]: BoardPost[] }, post) => {
    const targetDate = post.evntDt || post.crtDt;
    if (targetDate) {
      const d = new Date(targetDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!acc[day]) acc[day] = [];
        acc[day].push(post);
      }
    }
    return acc;
  }, {});

  const today = new Date();

  return (
    <div className="space-y-3 p-[var(--filter-pad)]">
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-[var(--filter-pad)] py-2">
        <h3 className="text-[length:var(--font-size-body)] font-semibold text-foreground">
          {format(currentViewDate, 'yyyy년 M월', { locale: ko })}
        </h3>
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="icon-sm" onClick={onPrevMonth} aria-label="이전 달">
            <ChevronRight className="rotate-180" size={16} aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="icon-sm" onClick={onNextMonth} aria-label="다음 달">
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* [2026-09-26 DIP V6] 한 달 조회에 상한이 있다. 넘으면 일부만 보인다는 사실을 말한다 — 빈 칸이 '일정 없음' 으로 읽히지 않게. */}
      {totalCount > list.length && (
        <p role="status" className="rounded-md border border-border bg-muted/40 px-[var(--filter-pad)] py-2 text-xs text-muted-foreground">
          이 달의 일정 {totalCount.toLocaleString()}건 중 {list.length.toLocaleString()}건만 표시합니다. 나머지는 목록 검색으로 확인하세요.
        </p>
      )}

      <div className="grid grid-cols-7 gap-px rounded-md border border-border bg-border">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d} className="bg-muted py-1 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
        {Array.from({ length: 42 }, (_, i) => i - firstDayOfMonth + 1).map((day, i) => {
          const isCurrentMonth = day > 0 && day <= daysInMonth;
          const dayPosts = isCurrentMonth ? postsByDay[day] || [] : [];
          const isToday = isCurrentMonth
            && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

          return (
            <div
              key={i}
              className={cn(
                'min-h-[5.5rem] bg-card p-1.5',
                isToday && 'bg-primary/5',
                !isCurrentMonth && 'bg-muted/40',
              )}
            >
              {isCurrentMonth && (
                <div className="mb-1 flex items-center justify-between">
                  <span className={cn(
                    'text-xs tabular-nums',
                    isToday ? 'font-semibold text-primary' : 'text-muted-foreground',
                  )}>
                    {day}
                  </span>
                  {dayPosts.length > 0 && (
                    <span className="rounded bg-muted px-1 text-xs tabular-nums text-muted-foreground">
                      {dayPosts.length}
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-0.5">
                {dayPosts.map((post) => (
                  <div key={post.pstSn}>
                    {/*
                      [2026-10-26 ADR-0043 UX-13] 칸 안의 날짜 숫자는 링크와 관계가 프로그램으로 이어지지 않아 화면낭독기는 제목만 읽었다.
                      링크 이름 앞에 날짜를 붙인다('10월 26일: 제목') — 보이는 제목은 그대로라 이름이 화면 글자를 담는다(WCAG 2.5.3).
                    */}
                    <Link
                      href={detailHref(bbsId, post.pstSn)}
                      className="block truncate rounded bg-muted px-1.5 py-0.5 text-xs text-foreground hover:bg-primary hover:text-primary-foreground"
                      title={post.pstTtl}
                    >
                      {/* 띄어쓰기는 숨긴 날짜 밖에 둔다 — 안에 두면 접근 이름 계산이 끝 공백을 지워 '15일:제목' 이 된다. */}
                      <span className="sr-only">{`${month + 1}월 ${day}일:`}</span>{' '}
                      {post.pstTtl}
                    </Link>
                    <PostStateBadges item={post} className="-ml-1.5" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * FAQ 한 항목.
 *
 * 펼침은 조건부 렌더로 충분하다 — 종전의 height 애니메이션(0.4초)은 답을 읽기까지 그만큼
 * 늦추기만 했다.
 *
 * [2026-09-26 DIP V6] 답은 **펼칠 때 상세 API 로 받는다.** 목록 응답에는 본문(pstCn)이 없어 종전에는
 * 모든 답이 빈 칸이었다. 본문은 에디터 HTML 이라 게시글 상세와 같은 살균기를 거쳐 그린다.
 */
const FAQItem = ({ item, bbsId, querySearchWrd }: { item: BoardPost; bbsId: string; querySearchWrd: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const answer = useQuery({
    queryKey: ['boardArticle', bbsId, item.pstSn],
    queryFn: () => knowledgeService.getArticle(bbsId, item.pstSn),
    enabled: isOpen && !!bbsId,
  });
  const answerHtml = answer.data ? (answer.data.pstCn || '') : '';

  return (
    <li className="bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">Q</span>
          <span className="min-w-0 text-[length:var(--font-size-body)] font-medium text-foreground">
            <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
            <PostStateBadges item={item} />
          </span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn('shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="border-t border-border px-3 py-2.5">
          <div className="flex gap-2">
            <span className="h-fit shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">A</span>
            <div className="min-w-0 space-y-2">
              {answer.isPending ? (
                <p className="text-[length:var(--font-size-body)] text-muted-foreground" role="status">답변을 불러오는 중입니다.</p>
              ) : answer.isError ? (
                <div className="flex flex-wrap items-center gap-2" role="alert">
                  <p className="text-[length:var(--font-size-body)] text-destructive">답변을 불러오지 못했습니다.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void answer.refetch()}>다시 시도</Button>
                </div>
              ) : answerHtml ? (
                <SanitizedFaqAnswer html={answerHtml} atchFileSn={answer.data?.atchFileSn} />
              ) : (
                <p className="text-[length:var(--font-size-body)] text-muted-foreground">등록된 답변이 없습니다.</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} aria-hidden="true" />
                  등록 <span className="tabular-nums">{toDisplayDate(item.crtDt)}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye size={12} aria-hidden="true" />
                  조회 <span className="tabular-nums">{item.inqCnt ?? 0}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
};

export const FaqTemplate = ({ list, bbsId, querySearchWrd }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {list.map((item) => (
        <FAQItem key={item.pstSn} item={item} bbsId={bbsId} querySearchWrd={querySearchWrd} />
      ))}
    </ul>
  );
};

export const WikiTemplate = ({ list, bbsId, querySearchWrd }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-card">
      {list.map((item) => (
        <li key={item.pstSn} className="flex items-start gap-3 p-3">
          <BookOpen size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="shrink-0">문서</Badge>
              <h4 className="min-w-0 text-[length:var(--font-size-body)] font-semibold text-foreground">
                <Link href={detailHref(bbsId, item.pstSn)} className="hover:text-primary hover:underline">
                  <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
                </Link>
                <PostStateBadges item={item} />
              </h4>
            </div>
            {/* [2026-09-26 DIP V6] 본문 미리보기 줄을 걷었다 — 목록 응답에 본문이 없어 늘 빈 줄이었다. 문서는 제목 링크로 연다. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                작성자 <HighlightText text={item.userNm} highlight={querySearchWrd} />
              </span>
              <span className="tabular-nums">{toDisplayDate(item.crtDt)}</span>
              <span>
                조회 <span className="tabular-nums">{(item.inqCnt || 0).toLocaleString()}</span>
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export const DefaultTemplate = ({ list, bbsId, querySearchWrd, handleLike, pendingLikePstSn, likesOpen, page = 1, totalCount = 0 }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[4.5rem] text-center">번호</TableHead>
            <TableHead>제목</TableHead>
            <TableHead className="w-[7rem] text-center">작성자</TableHead>
            <TableHead className="w-[7rem] text-center">등록일</TableHead>
            <TableHead className="w-[6rem] text-center">조회</TableHead>
            <TableHead className="w-[7rem] text-center">추천</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((item, idx) => (
            <TableRow key={item.pstSn}>
              {/*
                [2026-10-26 ADR-0043 UX-15] 번호는 표시 순서로 센 수다. 상단 고정 글은 기본 정렬에서 맨 위에 오므로 가장 큰 번호를 받아
                최신 글처럼 보였다 — 고정 글은 번호 대신 '고정' 이라고 쓴다(서버 판정 pinned 만 본다). 나머지 글의 번호는 그대로다.
              */}
              <TableCell className="text-center tabular-nums text-muted-foreground">
                {item.pinned === true ? '고정' : totalCount - ((page - 1) * 10) - idx}
              </TableCell>
              <TableCell>
                {/* 표지는 잘리는 제목 링크 밖에 둔다(UX-14) — 긴 제목이 표지를 밀어내지 않는다. */}
                <div className="flex min-w-0 items-center">
                  <Link href={detailHref(bbsId, item.pstSn)} className="min-w-0 truncate font-medium text-foreground hover:text-primary hover:underline">
                    <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
                  </Link>
                  <PostStateBadges item={item} />
                </div>
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                <HighlightText text={item.userNm} highlight={querySearchWrd} />
              </TableCell>
              {/* 점 구분(2026.09.20)을 쓰지 않는다 — 시스템 표준은 yyyy-MM-dd 다(DEC-OPS-100). */}
              <TableCell className="text-center tabular-nums text-muted-foreground">
                {toDisplayDate(item.crtDt)}
              </TableCell>
              <TableCell className="text-center tabular-nums text-muted-foreground">
                {(item.inqCnt || 0).toLocaleString()}
              </TableCell>
              <TableCell className="text-center">
                <LikeButton item={item} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} likesOpen={likesOpen} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const BoardSkeleton = ({ tmpltId }: { tmpltId: string }) => {
  if (tmpltId === 'TMPLT_HUB') {
    return (
      <div className="grid grid-cols-1 gap-2 p-[var(--filter-pad)] md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2 rounded-md border border-border p-3">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
            <Skeleton className="h-3 w-full rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (tmpltId === 'TMPLT_QNA') {
    return (
      <ul className="divide-y divide-border rounded-md border border-border">
        {[1, 2, 3, 4].map((i) => (
          <li key={i} className="flex items-start gap-3 p-3">
            <Skeleton className="h-6 w-20 shrink-0 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-3 w-2/3 rounded" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-1.5 p-[var(--filter-pad)]">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Skeleton key={i} className="h-9 w-full rounded" />
      ))}
    </div>
  );
};
