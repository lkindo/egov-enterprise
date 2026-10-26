import { cn } from '@/lib/utils';
import {
  Search,
  MessageSquare,
  Eye,
  Clock,
  ChevronRight,
  ThumbsUp,
  CheckCircle2,
  User,
  ChevronDown,
  Book,
  Lock,
  Paperclip,
  Pin,
  CalendarClock,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BOARD_LIST_ROUTE } from '@/lib/board/board-menu-links';
import { SERVER_MAX_FILE_SIZE_MB, formatMegabytes } from '@/lib/attachments/server-upload-limits';

/** 비밀글 정책 세 값(ADR-0040 결정 7). 마법사의 생성 스키마 어휘와 같다. */
export type PreviewPrivatePostPolicy = 'NONE' | 'OPTIONAL' | 'REQUIRED';

/**
 * [2026-10-26 ADR-0043 WIZ-09] 미리보기가 그릴 게시판 기능. 마법사가 고른 값 그대로다.
 *
 * 종전 미리보기는 화면 유형·이름·소개만 받아, 댓글·추천을 끈 게시판에도 댓글 수·추천 아이콘을 그렸다. 화면 유형은 만든 뒤 바꿀 수
 * 없으므로 그 선택의 근거가 실제와 다른 그림이면 안 된다 — 끈 기능의 표지는 그리지 않는다.
 */
export interface BoardPreviewFeatures {
  /** 댓글 받기(ansYn). */
  comments: boolean;
  /** 추천 받기(rcmdtnUseYn). */
  recommendations: boolean;
  /** 만족도 평가 받기(stsfdgYn). */
  satisfaction: boolean;
  /** 파일 첨부. 파일 수 0 은 개수 상한 없음, 파일당 크기 0 은 서버 전역 상한이다. */
  attachments: { allowed: boolean; maxFiles: number; maxFileBytes: number };
  /** 비밀글 정책. 없음이면 비밀글 표지가 없고, 필수면 모든 글이 비밀글이다. */
  privatePostPolicy: PreviewPrivatePostPolicy;
  /** 예약 게시 받기(rsvtPstgPsbltyYn). */
  reservation: boolean;
  /** 상단 고정 받기(upendFixPsbltyYn). */
  pinning: boolean;
}

interface PreviewProps {
  tmpltId: string;
  bbsTtl: string;
  bbsExpln: string;
  features: BoardPreviewFeatures;
}

const BYTES_PER_MB = 1024 * 1024;

/**
 * 미리보기 레이아웃이 받는 행 모양.
 *
 * [2026-09-03] 종전에는 레이아웃 7개가 전부 `posts: any[]` 였다. 그런데 호출부는 예외 없이
 * 바로 아래 {@link MOCK_POSTS} 하나만 넘긴다 — 외부 API 계약과 무관한 **이 파일 안의 예시 데이터**다.
 * 즉 넓힐 이유가 없는 자리였고, `any` 8건(미사용 prop 1건 포함)을 혼자 만들고 있었다.
 * 예시 데이터의 모양을 그대로 타입으로 삼아 실제 데이터가 들어오면 그때 계약을 바꾸게 한다.
 */
type PreviewPost = (typeof MOCK_POSTS)[number];

const MOCK_POSTS = [
  // [2026-09-03] `content` 를 채운 이유: FAQ 레이아웃(FaqLayout)이 첫 항목의 답변 본문으로
  //   `post.content` 를 렌더하는데 그 필드가 없어 **답변 상자가 늘 비어 있었다**.
  //   `posts: any[]` 라 타입 검사가 이 누락을 못 봤고, 미리보기는 FAQ 템플릿을
  //   '답변이 보이지 않는 템플릿' 으로 잘못 보여 주고 있었다.
  // [2026-10-26 WIZ-09] sample 은 이 예시 글이 어느 기능의 표지를 보이는 자리인지다(고정·비밀글·예약). 기능을 끄면 표지도 없다.
  { id: 1, title: '전자정부 표준프레임워크 4.x 업데이트 가이드라인', author: '관리자', date: '2024-05-20', views: 1240, comments: 45, likes: 12, files: 2, sample: 'pinned', content: '4.x 는 Java 21 과 Spring Boot 3 계열을 기준으로 합니다. 3.x 설정은 그대로 쓸 수 없으므로 마이그레이션 가이드의 호환성 표를 먼저 확인해 주세요.' },
  { id: 2, title: '리액트 서버 컴포넌트(RSC) 도입 시 주의사항 및 모범 사례', author: '기술혁신팀', date: '2024-05-19', views: 856, comments: 23, likes: 5, files: 0, sample: 'secret', content: '서버 컴포넌트에서는 브라우저 전용 API 를 쓸 수 없습니다. 상태가 필요한 구간만 클라이언트 컴포넌트로 분리하세요.' },
  { id: 3, title: 'MSA 환경에서의 분산 트랜잭션 처리 전략 (Saga 패턴)', author: '플랫폼실', date: '2024-05-18', views: 2301, comments: 67, likes: 31, files: 1, sample: 'scheduled', content: '2단계 커밋 대신 보상 트랜잭션으로 일관성을 맞춥니다. 각 단계는 실패 시 되돌릴 수 있어야 합니다.' },
] as const;

/** 파일당 크기 문구. 0 은 게시판 상한이 없어 서버 전역 상한이 적용된다. */
function fileSizeText(bytes: number): string {
  if (!(bytes > 0)) return `파일당 ${formatMegabytes(SERVER_MAX_FILE_SIZE_MB)}(전역 상한)`;
  return `파일당 ${formatMegabytes(bytes / BYTES_PER_MB)}`;
}

function isSecret(post: PreviewPost, features: BoardPreviewFeatures): boolean {
  return features.privatePostPolicy === 'REQUIRED' || (features.privatePostPolicy === 'OPTIONAL' && post.sample === 'secret');
}

/** 글 제목 옆 표지 — 고정·예약·비밀글·첨부. 끈 기능의 표지는 그리지 않는다. */
function PostMarks({ post, features }: { post: PreviewPost; features: BoardPreviewFeatures }) {
  const pinned = features.pinning && post.sample === 'pinned';
  const scheduled = features.reservation && post.sample === 'scheduled';
  const secret = isSecret(post, features);
  const attached = features.attachments.allowed && post.files > 0;
  if (!pinned && !scheduled && !secret && !attached) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {pinned && <Badge variant="outline" className="text-xs"><Pin aria-hidden="true" />고정</Badge>}
      {scheduled && <Badge variant="outline" className="text-xs"><CalendarClock aria-hidden="true" />예약</Badge>}
      {secret && <Badge variant="outline" className="text-xs"><Lock aria-hidden="true" />비밀글</Badge>}
      {attached && <Badge variant="outline" className="text-xs"><Paperclip aria-hidden="true" />첨부 {post.files}</Badge>}
    </span>
  );
}

/** 글 줄의 수치 — 조회 수는 늘, 댓글 수·추천 수는 그 기능을 받을 때만 보인다. */
function PostStats({ post, features, className }: { post: PreviewPost; features: BoardPreviewFeatures; className?: string }) {
  return (
    <span className={cn('flex flex-wrap items-center gap-3 text-xs text-muted-foreground', className)}>
      <span className="flex items-center gap-1"><Eye size={12} aria-hidden="true" />조회 {post.views}</span>
      {features.comments && <span className="flex items-center gap-1"><MessageSquare size={12} aria-hidden="true" />댓글 {post.comments}</span>}
      {features.recommendations && <span className="flex items-center gap-1"><ThumbsUp size={12} aria-hidden="true" />추천 {post.likes}</span>}
    </span>
  );
}

export function BoardPreview({ tmpltId, bbsTtl, bbsExpln, features }: PreviewProps) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-md border border-border bg-muted">
      {/* [2026-10-26 WIZ-09] 지어낸 주소 대신 실제 이용 화면 주소 형태를 보인다 — 게시판 ID 는 만들 때 정해진다. */}
      <div className="flex min-h-9 items-center bg-surface-inverse px-3 py-1.5">
        <span className="break-all font-mono text-xs text-surface-inverse-muted">
          {`${BOARD_LIST_ROUTE}?bbsId=(만들 때 정해짐)`}
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-auto bg-card p-4">
        {/* 게시판 머리 */}
        <div className="space-y-2 border-b border-border pb-4">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xl font-bold tracking-tight text-foreground">{bbsTtl || '게시판 이름'}</p>
              <p className="text-[length:var(--font-size-body)] text-muted-foreground">{bbsExpln || '게시판 소개가 여기에 보입니다.'}</p>
            </div>
            <div className="flex shrink-0 gap-2" aria-hidden="true">
              <div className="flex size-10 items-center justify-center rounded-lg bg-surface-inverse text-surface-inverse-foreground"><Search size={18} /></div>
              <div className="flex h-10 items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground">글쓰기</div>
            </div>
          </div>
        </div>

        {/* 화면 유형별 목록 */}
        {tmpltId === 'TMPLT_HUB' && <HubLayout posts={MOCK_POSTS} features={features} />}
        {tmpltId === 'TMPLT_LIST' && <ListLayout posts={MOCK_POSTS} features={features} />}
        {tmpltId === 'TMPLT_GALLERY' && <GalleryLayout posts={MOCK_POSTS} features={features} />}
        {tmpltId === 'TMPLT_QNA' && <QnaLayout posts={MOCK_POSTS} features={features} />}
        {tmpltId === 'TMPLT_CALENDAR' && <CalendarLayout />}
        {tmpltId === 'TMPLT_FAQ' && <FaqLayout posts={MOCK_POSTS} features={features} />}
        {tmpltId === 'TMPLT_WIKI' && <WikiLayout posts={MOCK_POSTS} features={features} />}

        <PostScreenFeatures features={features} />
      </div>

      <div className="flex h-10 items-center justify-center border-t border-border bg-muted">
        <span className="text-xs font-bold tracking-tight text-muted-foreground">예시 데이터로 그린 레이아웃 미리보기입니다</span>
      </div>
    </div>
  );
}

/**
 * 글 보기·쓰기 화면에 덧붙는 것 — 첨부·추천·만족도 평가·댓글(보기 화면), 비밀글·게시 시작일(쓰기 화면). 고른 기능만 그린다.
 * 상단 고정은 목록의 '고정' 표지로 보인다(고정·해제는 운영 화면에서 한다).
 */
function PostScreenFeatures({ features }: { features: BoardPreviewFeatures }) {
  const { attachments } = features;
  const viewItems = [
    attachments.allowed && (
      <li key="attachments" className="flex items-center gap-2">
        <Paperclip size={14} aria-hidden="true" />
        첨부 파일 — {attachments.maxFiles === 0 ? '개수 상한 없음' : `${attachments.maxFiles}개까지`} · {fileSizeText(attachments.maxFileBytes)}
      </li>
    ),
    features.recommendations && (
      <li key="recommendations" className="flex items-center gap-2"><ThumbsUp size={14} aria-hidden="true" />추천 단추</li>
    ),
    features.satisfaction && (
      <li key="satisfaction" className="flex items-center gap-2"><Star size={14} aria-hidden="true" />만족도 평가</li>
    ),
    features.comments && (
      <li key="comments" className="flex items-center gap-2"><MessageSquare size={14} aria-hidden="true" />댓글 쓰기</li>
    ),
  ].filter(Boolean);
  const writeItems = [
    features.privatePostPolicy === 'OPTIONAL' && (
      <li key="secret" className="flex items-center gap-2"><Lock size={14} aria-hidden="true" />비밀글로 쓰기(글쓴이가 고름)</li>
    ),
    features.privatePostPolicy === 'REQUIRED' && (
      <li key="secret" className="flex items-center gap-2"><Lock size={14} aria-hidden="true" />모든 글을 비밀글로 저장</li>
    ),
    features.reservation && (
      <li key="reservation" className="flex items-center gap-2"><CalendarClock size={14} aria-hidden="true" />게시 시작일(오늘보다 뒤면 예약 글)</li>
    ),
  ].filter(Boolean);

  return (
    <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 text-xs text-foreground sm:grid-cols-2">
      <div className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3">
        <p className="font-semibold text-muted-foreground">글 보기 화면</p>
        {viewItems.length > 0
          ? <ul className="space-y-1">{viewItems}</ul>
          : <p className="text-muted-foreground">첨부·추천·만족도 평가·댓글을 받지 않아 글 아래에 덧붙는 것이 없습니다.</p>}
      </div>
      <div className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3">
        <p className="font-semibold text-muted-foreground">글쓰기 화면</p>
        {writeItems.length > 0
          ? <ul className="space-y-1">{writeItems}</ul>
          : <p className="text-muted-foreground">비밀글·예약 게시 칸 없이 제목·본문{attachments.allowed ? '·첨부' : ''}만 씁니다.</p>}
      </div>
    </div>
  );
}

function HubLayout({ posts, features }: { posts: readonly PreviewPost[]; features: BoardPreviewFeatures }) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-lg bg-surface-inverse p-6 text-surface-inverse-foreground">
        <div className="absolute right-[-10%] top-[-20%] h-64 w-64 rounded-lg bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="relative z-10 space-y-3">
          <span className="text-xs text-surface-inverse-muted">추천 지식</span>
          <p className="text-2xl font-bold leading-tight tracking-tight">{posts[0].title}</p>
          <PostMarks post={posts[0]} features={features} />
          <div className="mt-4 flex items-center gap-6">
            <span className="text-xs font-bold">작성자 {posts[0].author}</span>
            <span className="flex items-center gap-2 text-surface-inverse-muted">
              <Clock size={12} aria-hidden="true" />
              <span className="text-xs font-bold">1시간 전</span>
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {posts.slice(1).map((post) => (
          <div key={post.id} className="space-y-3 rounded-lg border-2 border-border bg-muted p-4 transition-all hover:border-foreground">
            <p className="text-sm font-bold leading-snug text-foreground">{post.title}</p>
            <PostMarks post={post} features={features} />
            <div className="flex items-center justify-between pt-2">
              <PostStats post={post} features={features} />
              <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground" aria-hidden="true">
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListLayout({ posts, features }: { posts: readonly PreviewPost[]; features: BoardPreviewFeatures }) {
  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <div key={post.id} className="group flex items-center justify-between gap-4 border-b-2 border-border p-4 transition-all hover:bg-muted">
          <div className="flex flex-1 items-center gap-6">
            <span className="w-8 text-xs font-bold text-muted-foreground">{post.id}</span>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">{post.title}</p>
              <PostMarks post={post} features={features} />
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs font-bold text-muted-foreground">{post.author}</span>
                <PostStats post={post} features={features} />
              </div>
            </div>
          </div>
          <p className="shrink-0 text-xs font-bold text-muted-foreground">{post.date}</p>
        </div>
      ))}
    </div>
  );
}

function GalleryLayout({ posts, features }: { posts: readonly PreviewPost[]; features: BoardPreviewFeatures }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {posts.map((post) => (
        <div key={post.id} className="group overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-primary">
          <div className="relative h-40 overflow-hidden">
            {/*
              [2026-08-29] 예시 이미지(unsplash) 제거. 미리보기의 목적은 레이아웃 확인이지 사진이
              아니고, 관리자 화면이 외부 호스트로 나갈 이유가 없다.
            */}
            <div aria-hidden="true" className="absolute inset-0 bg-muted" />
            <div className="absolute right-2 top-2 rounded bg-surface-inverse/90 px-2 py-0.5 text-xs text-surface-inverse-foreground">사진</div>
          </div>
          <div className="space-y-4 p-6">
            <p className="text-xl font-bold leading-snug tracking-tighter text-foreground">{post.title}</p>
            <PostMarks post={post} features={features} />
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-3">
                <User size={14} className="text-muted-foreground" aria-hidden="true" />
                <span className="text-xs font-bold text-foreground">{post.author}</span>
              </div>
              <PostStats post={post} features={features} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function QnaLayout({ posts, features }: { posts: readonly PreviewPost[]; features: BoardPreviewFeatures }) {
  return (
    <div className="space-y-4">
      {posts.map((post, idx) => (
        <div key={post.id} className="group flex gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:border-primary">
          <div className="flex min-w-[60px] flex-col items-center gap-1">
            <div className={cn(
              'flex size-9 items-center justify-center rounded-md border text-base font-semibold',
              idx === 0 ? 'border-success/40 bg-success/15 text-foreground' : 'border-border bg-muted text-muted-foreground',
            )}>
              {idx === 0 ? <CheckCircle2 size={18} aria-hidden="true" /> : '?'}
            </div>
            <span className="text-xs text-muted-foreground">{idx === 0 ? '해결' : '미해결'}</span>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Badge className="border-none bg-muted text-xs font-bold text-muted-foreground hover:bg-muted">업무 문의</Badge>
              <span className="text-xs font-bold text-muted-foreground">{post.date}</span>
            </div>
            <p className="text-[length:var(--font-size-body)] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">{post.title}</p>
            <PostMarks post={post} features={features} />
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-1"><User size={12} aria-hidden="true" /> {post.author}</span>
              <PostStats post={post} features={features} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FaqLayout({ posts, features }: { posts: readonly PreviewPost[]; features: BoardPreviewFeatures }) {
  return (
    <div className="space-y-4">
      {posts.slice(0, 3).map((post, idx) => (
        <Card key={post.id} className="group overflow-hidden rounded-lg border-2 border-border transition-all hover:border-hub-purple">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex size-10 items-center justify-center rounded-lg text-lg font-bold transition-all',
                idx === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                질문
              </div>
              <div className="space-y-1">
                <p className="text-[length:var(--font-size-body)] font-semibold text-foreground">{post.title}</p>
                <PostMarks post={post} features={features} />
              </div>
            </div>
            <ChevronDown className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          {idx === 0 && (
            <div className="px-6 pb-6">
              <div className="rounded-lg border-l-8 border-hub-purple bg-muted p-4 font-medium leading-relaxed text-muted-foreground">
                {post.content}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function WikiLayout({ posts, features }: { posts: readonly PreviewPost[]; features: BoardPreviewFeatures }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {posts.map((post) => (
        <Card key={post.id} className="group overflow-hidden rounded-md border border-border transition-colors hover:border-primary">
          <div className="flex">
            <div className="flex w-14 shrink-0 items-center justify-center border-r border-border bg-muted transition-colors group-hover:bg-surface-inverse group-hover:text-surface-inverse-foreground" aria-hidden="true">
              <Book size={22} className="opacity-40" />
            </div>
            <div className="space-y-2 p-4">
              <p className="text-[length:var(--font-size-body)] font-semibold text-foreground transition-colors group-hover:text-primary">{post.title}</p>
              <PostMarks post={post} features={features} />
              <p className="text-xs text-muted-foreground">마지막 수정: {post.author}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function CalendarLayout() {
  const days = Array.from({ length: 35 }, (_, i) => i + 1 - 3); // 미리보기용 단순 시작 오프셋
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border-2 border-border bg-muted p-4">
        <p className="text-[length:var(--font-size-body)] font-semibold text-foreground">2024년 5월</p>
        <div className="flex gap-2" aria-hidden="true">
          <div className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground"><ChevronRight className="rotate-180" size={16} /></div>
          <div className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground"><ChevronRight size={16} /></div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center text-xs text-muted-foreground">{d}</div>
        ))}
        {days.map((day, i) => (
          <div key={i} className={cn(
            'group relative h-20 overflow-hidden rounded-lg border-2 border-border p-2 transition-all',
            day === 20 ? 'border-primary/20 bg-primary/5' : 'bg-card',
            day <= 0 || day > 31 ? 'opacity-10' : 'hover:border-foreground',
          )}>
            <span className={cn('text-xs font-bold', day === 20 ? 'text-primary' : 'text-muted-foreground')}>
              {day > 0 && day <= 31 ? day : ''}
            </span>
            {day === 20 && (
              <div className="mt-2 rounded-sm bg-primary p-1.5 text-xs font-bold leading-tight text-primary-foreground">
                기술 세미나
              </div>
            )}
            {day === 21 && (
              <div className="mt-1 rounded-sm bg-surface-inverse p-1.5 text-xs font-bold leading-tight text-surface-inverse-foreground">
                정기 점검
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
