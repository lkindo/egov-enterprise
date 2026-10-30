import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Eye,
  Clock,
  ThumbsUp,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  Lock,
  Paperclip,
  Pin,
  CalendarClock,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BOARD_LIST_ROUTE } from '@/lib/board/board-menu-links';
import { QNA_STATUS_LABELS } from '@/lib/board/qna-status';
import { SERVER_MAX_FILE_SIZE_MB, formatMegabytes } from '@/lib/attachments/server-upload-limits';

/** 비밀글 정책 세 값(ADR-0040 결정 7). 마법사의 생성 스키마 어휘와 같다. */
export type PreviewPrivatePostPolicy = 'NONE' | 'OPTIONAL' | 'REQUIRED';

/**
 * [2026-10-26 ADR-0043 WIZ-09] 미리보기가 그릴 게시판 기능. 마법사가 고른 값 그대로다.
 *
 * 목록 배치는 실제 BoardTemplates와 맞춘다. 신규 댓글·추천을 받는 설정과 기존 누적 수 표시는 구별한다.
 * 실제 조회·추천·이동을 연결하지 않고 예시 데이터만 그린다.
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
  { id: 1, title: '전자정부 표준프레임워크 4.x 업데이트 가이드라인', author: '관리자', date: '2024-05-20', views: 1240, comments: 45, likes: 12, files: 2, sample: 'pinned', solved: true, content: '4.x 는 Java 21 과 Spring Boot 3 계열을 기준으로 합니다. 3.x 설정은 그대로 쓸 수 없으므로 마이그레이션 가이드의 호환성 표를 먼저 확인해 주세요.' },
  { id: 2, title: '리액트 서버 컴포넌트(RSC) 도입 시 주의사항 및 모범 사례', author: '기술혁신팀', date: '2024-05-19', views: 856, comments: 23, likes: 5, files: 0, sample: 'secret', solved: false, content: '서버 컴포넌트에서는 브라우저 전용 API 를 쓸 수 없습니다. 상태가 필요한 구간만 클라이언트 컴포넌트로 분리하세요.' },
  { id: 3, title: 'MSA 환경에서의 분산 트랜잭션 처리 전략 (Saga 패턴)', author: '플랫폼실', date: '2024-05-18', views: 2301, comments: 67, likes: 31, files: 1, sample: 'scheduled', solved: false, content: '2단계 커밋 대신 보상 트랜잭션으로 일관성을 맞춥니다. 각 단계는 실패 시 되돌릴 수 있어야 합니다.' },
] as const;

/** 파일당 크기 문구. 0 은 게시판 상한이 없어 서버 전역 상한이 적용된다. */
function fileSizeText(bytes: number): string {
  if (!(bytes > 0)) return `파일당 ${formatMegabytes(SERVER_MAX_FILE_SIZE_MB)}(전역 상한)`;
  return `파일당 ${formatMegabytes(bytes / BYTES_PER_MB)}`;
}

function isSecret(post: PreviewPost, features: BoardPreviewFeatures): boolean {
  return features.privatePostPolicy === 'REQUIRED' || (features.privatePostPolicy === 'OPTIONAL' && post.sample === 'secret');
}

/** 새 게시판의 예시 글 상태. 첨부 수는 실제 목록처럼 갤러리에만 따로 표시한다. */
function PostMarks({ post, features }: { post: PreviewPost; features: BoardPreviewFeatures }) {
  const pinned = features.pinning && post.sample === 'pinned';
  const scheduled = features.reservation && post.sample === 'scheduled';
  const secret = isSecret(post, features);
  if (!pinned && !scheduled && !secret) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {pinned && <Badge variant="outline" className="text-xs"><Pin aria-hidden="true" />고정</Badge>}
      {scheduled && <Badge variant="outline" className="text-xs"><CalendarClock aria-hidden="true" />예약</Badge>}
      {secret && <Badge variant="outline" className="text-xs"><Lock aria-hidden="true" />비밀글</Badge>}
    </span>
  );
}

/** HUB·GALLERY의 실제 PostMeta와 같은 누적 수. 새 댓글 허용과 과거 댓글 표시는 별개다. */
function PostStats({ post }: { post: PreviewPost }) {
  return (
    <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><Clock size={12} aria-hidden="true" />{post.date}</span>
      <span className="flex items-center gap-1"><Eye size={12} aria-hidden="true" />조회 {post.views.toLocaleString()}</span>
      <span className="flex items-center gap-1"><MessageSquare size={12} aria-hidden="true" />댓글 {post.comments}</span>
    </span>
  );
}

/** 실제 LikeButton처럼 추천을 받지 않아도 누적 수는 남긴다. 미리보기에는 변경 동작이 없다. */
function LikeCount({ post, enabled }: { post: PreviewPost; enabled: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', enabled && 'rounded-md border border-border px-2 py-1')}>
      <ThumbsUp size={14} aria-hidden="true" />추천 {post.likes}
    </span>
  );
}

export function BoardPreview({ tmpltId, bbsTtl, bbsExpln, features }: PreviewProps) {
  return (
    <section aria-label="게시판 레이아웃 미리보기" className="relative flex min-w-0 w-full flex-col overflow-hidden rounded-md border border-border bg-muted">
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

          </div>
        </div>

        {/* 화면 유형별 목록 */}
        {tmpltId === 'TMPLT_HUB' && <HubLayout posts={MOCK_POSTS} features={features} />}
        {tmpltId === 'TMPLT_LIST' && <ListLayout posts={MOCK_POSTS} features={features} />}
        {tmpltId === 'TMPLT_GALLERY' && <GalleryLayout posts={MOCK_POSTS} features={features} />}
        {tmpltId === 'TMPLT_QNA' && <QnaLayout posts={MOCK_POSTS} features={features} />}
        {tmpltId === 'TMPLT_CALENDAR' && <CalendarLayout features={features} />}
        {tmpltId === 'TMPLT_FAQ' && <FaqLayout posts={MOCK_POSTS} features={features} />}
        {tmpltId === 'TMPLT_WIKI' && <WikiLayout posts={MOCK_POSTS} features={features} />}

        <PostScreenFeatures features={features} />
      </div>

      <p className="border-t border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
        예시 데이터로 그린 레이아웃 미리보기입니다. 댓글·추천 수는 누적 예시이며 새 글이나 추천을 저장하지 않습니다.
      </p>
    </section>
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
          : <p className="text-muted-foreground">새 첨부·추천·만족도 평가·댓글을 받지 않습니다. 기존 댓글과 누적 추천 수는 유지됩니다.</p>}
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
  const [lead, ...rest] = posts;
  return (
    <div className="space-y-3">
      <article className="rounded-md border border-primary/30 bg-primary/5 p-3">
        <Badge variant="secondary">대표 게시글</Badge>
        <p className="mt-1 text-base font-semibold text-foreground">{lead.title}</p>
        <PostMarks post={lead} features={features} />
        <p className="my-1 text-xs text-muted-foreground">{lead.author}</p>
        <PostStats post={lead} />
      </article>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rest.map(post => (
          <article key={post.id} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
            <PostMarks post={post} features={features} />
            <p className="text-[length:var(--font-size-body)] font-semibold text-foreground">{post.title}</p>
            <p className="text-xs text-muted-foreground">{post.author}</p>
            <PostStats post={post} />
          </article>
        ))}
      </div>
    </div>
  );
}

function ListLayout({ posts, features }: { posts: readonly PreviewPost[]; features: BoardPreviewFeatures }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table aria-label="게시글 목록 예시">
        <TableHeader className="bg-muted/50">
          <TableRow>
            {['번호', '제목', '작성자', '등록일', '조회', '추천'].map(label => <TableHead key={label}>{label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post, index) => (
            <TableRow key={post.id}>
              <TableCell>{features.pinning && post.sample === 'pinned' ? '고정' : posts.length - index}</TableCell>
              <TableCell><p className="min-w-40 whitespace-normal font-medium">{post.title}</p><PostMarks post={post} features={features} /></TableCell>
              <TableCell className="text-muted-foreground">{post.author}</TableCell>
              <TableCell className="text-muted-foreground">{post.date}</TableCell>
              <TableCell>{post.views.toLocaleString()}</TableCell>
              <TableCell><LikeCount post={post} enabled={features.recommendations} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GalleryLayout({ posts, features }: { posts: readonly PreviewPost[]; features: BoardPreviewFeatures }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      {posts.map(post => (
        <article key={post.id} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Badge variant="secondary">갤러리</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip size={12} aria-hidden="true" />
              {features.attachments.allowed && post.files > 0 ? `첨부 ${post.files}` : '첨부 없음'}
            </span>
          </div>
          <PostMarks post={post} features={features} />
          <p className="text-[length:var(--font-size-body)] font-semibold text-foreground">{post.title}</p>
          <p className="text-xs text-muted-foreground">{post.author}</p>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-2">
            <PostStats post={post} />
            <LikeCount post={post} enabled={features.recommendations} />
          </div>
        </article>
      ))}
    </div>
  );
}

function QnaLayout({ posts, features }: { posts: readonly PreviewPost[]; features: BoardPreviewFeatures }) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-card">
      {posts.map(post => (
        <li key={post.id} className="flex flex-wrap items-start gap-3 p-3">
          <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded border px-2 py-0.5 text-xs text-foreground', post.solved ? 'border-success/40 bg-success/15' : 'border-warning/40 bg-warning/15')}>
            {post.solved ? <CheckCircle2 size={14} aria-hidden="true" /> : <HelpCircle size={14} aria-hidden="true" />}
            {post.solved ? QNA_STATUS_LABELS.SOLVED : QNA_STATUS_LABELS.OPEN}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[length:var(--font-size-body)] font-semibold text-foreground">{post.title}</p>
            <PostMarks post={post} features={features} />
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>분류 일반</span><span>{post.author}</span><span>{post.date}</span>
              <span className="inline-flex items-center gap-1"><MessageSquare size={12} aria-hidden="true" />답변 {post.comments}</span>
            </div>
          </div>
          <LikeCount post={post} enabled={features.recommendations} />
        </li>
      ))}
    </ul>
  );
}

function FaqLayout({ posts, features }: { posts: readonly PreviewPost[]; features: BoardPreviewFeatures }) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {posts.map(post => (
        <li key={post.id} className="bg-card">
          <details>
            <summary className="cursor-pointer px-3 py-2.5 text-[length:var(--font-size-body)] font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              <span className="mr-2 rounded bg-muted px-1.5 text-xs">Q</span>{post.title}
              <PostMarks post={post} features={features} />
            </summary>
            <div className="space-y-2 border-t border-border px-3 py-2.5">
              <p className="text-[length:var(--font-size-body)] text-foreground"><span className="mr-2 rounded bg-muted px-1.5 text-xs">A</span>{post.content}</p>
              <p className="text-xs text-muted-foreground">등록 {post.date} · 조회 {post.views}</p>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

function WikiLayout({ posts, features }: { posts: readonly PreviewPost[]; features: BoardPreviewFeatures }) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-card">
      {posts.map(post => (
        <li key={post.id} className="flex items-start gap-3 p-3">
          <BookOpen size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">문서</Badge>
              <p className="text-[length:var(--font-size-body)] font-semibold text-foreground">{post.title}</p>
              <PostMarks post={post} features={features} />
            </div>
            <p className="text-xs text-muted-foreground">작성자 {post.author} · {post.date} · 조회 {post.views.toLocaleString()}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function CalendarLayout({ features }: { features: BoardPreviewFeatures }) {
  const days = Array.from({ length: 42 }, (_, i) => i + 1 - 3); // 미리보기용 단순 시작 오프셋
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card px-3 py-2">
        <p className="text-[length:var(--font-size-body)] font-semibold text-foreground">2024년 5월 · 예시</p>
      </div>
      <div className="overflow-x-auto"><div className="grid min-w-80 grid-cols-7 gap-px rounded-md border border-border bg-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-muted py-1 text-center text-xs text-muted-foreground">{d}</div>
        ))}
        {days.map((day, i) => (
          <div key={i} className={cn(
            'min-h-[5.5rem] p-1.5',
            day <= 0 || day > 31 ? 'bg-muted/40' : 'bg-card',
          )}>
            <span className="text-xs tabular-nums text-muted-foreground">
              {day > 0 && day <= 31 ? day : ''}
            </span>
            {day === 20 && (
              <div className="mt-2 space-y-1">
                <p className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">기술 세미나</p>
                <PostMarks post={MOCK_POSTS[0]} features={features} />
              </div>
            )}
            {day === 21 && (
              <div className="mt-1 space-y-1">
                <p className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">정기 점검</p>
                <PostMarks post={MOCK_POSTS[1]} features={features} />
              </div>
            )}
            {day === 22 && (
              <div className="mt-1 space-y-1">
                <p className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">교육 안내</p>
                <PostMarks post={MOCK_POSTS[2]} features={features} />
              </div>
            )}
          </div>
        ))}
      </div></div>
    </div>
  );
}
