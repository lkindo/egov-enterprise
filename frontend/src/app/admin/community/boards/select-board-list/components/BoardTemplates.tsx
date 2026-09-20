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
 */
import React, { useState } from 'react';
import Link from 'next/link';
import { BoardPost } from '@/types/business/board';
import { HighlightText } from './HighlightText';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  BookOpen, Clock, Eye, MessageSquare, ChevronRight, ThumbsUp,
  HelpCircle, CheckCircle2, ChevronDown, Paperclip,
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

interface TemplateProps {
  list: BoardPost[];
  bbsId: string;
  querySearchWrd: string;
  handleLike: (e: React.MouseEvent, pstSn: number) => void;
  pendingLikePstSn: number | null;
  page?: number;
  totalCount?: number;
}

/** 저장 값은 `yyyy-MM-dd…` 이므로 앞 10자리가 곧 표시 형식이다. 점 구분으로 바꾸지 않는다. */
const toDisplayDate = (value: string | undefined) =>
  (value ? String(value).substring(0, 10) : '-');

const detailHref = (bbsId: string, pstSn: number) =>
  `/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`;

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

/** 추천 버튼. 동기 잠금과 진행 표시는 호출부(BoardListClient)가 소유한다. */
function LikeButton({
  item,
  handleLike,
  pendingLikePstSn,
}: Pick<TemplateProps, 'handleLike' | 'pendingLikePstSn'> & { item: BoardPost }) {
  const pending = pendingLikePstSn === item.pstSn;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={(e) => handleLike(e, item.pstSn)}
      disabled={pendingLikePstSn !== null}
      aria-busy={pending || undefined}
      aria-label={`${item.pstTtl} ${pending ? '추천 처리 중' : '추천'}`}
      className="gap-1.5"
    >
      <ThumbsUp size={14} aria-hidden="true" />
      <span className="tabular-nums">{pending ? '처리 중…' : item.likeCnt || 0}</span>
    </Button>
  );
}

export const HubTemplate = ({ list, bbsId, page = 1 }: TemplateProps) => {
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
              {lead.pstTtl}
            </Link>
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
            <h4 className="line-clamp-2 text-[length:var(--font-size-body)] font-semibold text-foreground">
              <Link href={detailHref(bbsId, item.pstSn)} className="hover:text-primary hover:underline">
                {item.pstTtl}
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

export const GalleryTemplate = ({ list, bbsId, querySearchWrd, handleLike, pendingLikePstSn }: TemplateProps) => {
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
            <h3 className="line-clamp-2 text-[length:var(--font-size-body)] font-semibold text-foreground">
              <Link href={detailHref(bbsId, item.pstSn)} className="hover:text-primary hover:underline">
                <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
              </Link>
            </h3>
            <p className="text-xs text-muted-foreground">
              <HighlightText text={item.userNm} highlight={querySearchWrd} />
            </p>
            <div className="mt-auto flex items-end justify-between gap-2">
              <PostMeta item={item} />
              <LikeButton item={item} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} />
            </div>
          </article>
        );
      })}
    </div>
  );
};

export const QnaTemplate = ({ list, bbsId, querySearchWrd, handleLike, pendingLikePstSn }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-card">
      {list.map((item) => {
        const solved = item.qnaSttsCd === 'SOLVED';
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
              {solved ? '해결됨' : '답변 대기'}
            </span>

            <div className="min-w-0 flex-1 space-y-1">
              <h4 className="text-[length:var(--font-size-body)] font-semibold text-foreground">
                <Link href={detailHref(bbsId, item.pstSn)} className="hover:text-primary hover:underline">
                  <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
                </Link>
              </h4>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{item.qnaCatCd || '일반 문의'}</span>
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

            <LikeButton item={item} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} />
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

export const CalendarTemplate = ({ list, bbsId, currentViewDate, onPrevMonth, onNextMonth }: CalendarTemplateProps) => {
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
                  <Link
                    key={post.pstSn}
                    href={detailHref(bbsId, post.pstSn)}
                    className="block truncate rounded bg-muted px-1.5 py-0.5 text-xs text-foreground hover:bg-primary hover:text-primary-foreground"
                    title={post.pstTtl}
                  >
                    {post.pstTtl}
                  </Link>
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
 */
const FAQItem = ({ item }: { item: BoardPost }) => {
  const [isOpen, setIsOpen] = useState(false);

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
          <span className="min-w-0 text-[length:var(--font-size-body)] font-medium text-foreground">{item.pstTtl}</span>
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
              <p className="whitespace-pre-wrap text-[length:var(--font-size-body)] leading-relaxed text-foreground">
                {item.pstCn}
              </p>
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

export const FaqTemplate = ({ list }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {list.map((item) => (
        <FAQItem key={item.pstSn} item={item} />
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
              </h4>
            </div>
            <p className="line-clamp-2 text-[length:var(--font-size-body)] text-muted-foreground">{item.pstCn}</p>
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

export const DefaultTemplate = ({ list, bbsId, querySearchWrd, handleLike, pendingLikePstSn, page = 1, totalCount = 0 }: TemplateProps) => {
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
              <TableCell className="text-center tabular-nums text-muted-foreground">
                {totalCount - ((page - 1) * 10) - idx}
              </TableCell>
              <TableCell>
                <Link href={detailHref(bbsId, item.pstSn)} className="block truncate font-medium text-foreground hover:text-primary hover:underline">
                  <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
                </Link>
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
                <LikeButton item={item} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} />
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
