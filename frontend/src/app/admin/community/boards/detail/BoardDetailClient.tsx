'use client';

import React, { use, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Trash2,
  Download,
  Calendar, Eye, User,
  FileText, Quote, AlertTriangle,
  Package, ThumbsUp, Bookmark
} from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { cn } from '@/lib/utils';
import { canPermission } from '@/lib/auth/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeService, KnowledgeDto } from '@/services/business/knowledge/knowledgeService';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { fileService } from '@/services/foundation/file/FileService';
import { deleteBoardArticle } from '@/app/actions/boardActions';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import type { BoardMeta } from '@/services/business/user/board/BoardUserService';
import { boardMasterQueryOptions } from '@/queries/board-master-query-options';
import { scrapMutationOptions } from '@/queries/scrap-query-options';
import CommentSection from '@/components/features/comment/CommentSection';
import SatisfactionSection from '@/components/features/satisfaction/SatisfactionSection';

import { CommentVO } from '@/types/business/comment';

interface BoardDetailClientProps {
  dataPromise: Promise<{
    article: KnowledgeDto | null;
    masterInfo: BoardMeta | null;
    initialComments: CommentVO[];
    /** 감사 P1-1: 서버 조회 실패 사유. null 이면 정상(또는 404 = 실제로 없는 글). */
    fetchError: string | null;
  }>;
}

/** 표시 판정: 자기 글은 기능권한과 esntlId 소유자가 모두 필요하고, 전체 관리 권한은 별도다.
 * 서버가 매 요청의 현재 권한과 게시글 소유권을 최종 판정한다. */

export function canManageBoardArticle(
  user: { id: string; esntlId?: string; role?: string; permissions?: readonly string[]; authorizationVersion?: string } | null | undefined,
  authorId: string | undefined,
  action: 'UPDATE' | 'DELETE' = 'UPDATE',
): boolean {
  if (!user || !canPermission(user, `BOARD_${action}`)) return false;
  return canPermission(user, `BOARD_${action}_ALL`) || Boolean(authorId && user.esntlId && user.esntlId === authorId);
}


export function BoardDetailClient({ dataPromise }: BoardDetailClientProps) {
  const initialData = use(dataPromise);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const bbsId = searchParams.get('bbsId');
  // [PD-UX-002 Q4] 서버와 같은 키 공간을 읽는다.
  //   page.tsx 는 `params.pstSn || params.nttId` 로 **두 키를 다 받는데** 여기는 pstSn 만 읽었다.
  //   그래서 `?nttId=` 로 들어오면 서버는 글을 제대로 렌더하지만 클라이언트는 pstSn=0 으로 동작했다 —
  //   화면이 "게시글 번호: 0" 을 표시하고, 수정 버튼이 0번 글로 이동하며, 댓글·만족도 섹션에도 0 이
  //   전달됐다. 추천만 hasValidPstSn 가드에 막혀 조용히 아무 일도 하지 않았다.
  //   nttId 는 레거시 별칭이다(백엔드 파라미터에는 존재하지 않고, knowledgeService 가 응답에서
  //   이미 pstSn 으로 정규화한다). 새 링크는 pstSn 을 쓰되 기존 링크·북마크는 계속 받는다.
  const rawPstSn = searchParams.get('pstSn') ?? searchParams.get('nttId');
  const pstSn = Number(rawPstSn);
  const hasValidPstSn = Number.isSafeInteger(pstSn) && pstSn > 0;
  const queryClient = useQueryClient();

  // React Query for revalidation/stale handling, seeded with initialData
  const { data: masterInfo } = useQuery({
    ...boardMasterQueryOptions.meta(bbsId ?? ''),
    initialData: initialData.masterInfo ?? undefined,
    enabled: Boolean(initialData.masterInfo && bbsId),
  });

  const { data: article } = useQuery({
    queryKey: ['article-detail', bbsId, pstSn],
    queryFn: () => knowledgeService.getArticle(bbsId!, pstSn),
    initialData: initialData.article,
    enabled: !!initialData.article && hasValidPstSn,
  });
  const canUpdateArticle = canManageBoardArticle(user, article?.userId, 'UPDATE');
  const canDeleteArticle = canManageBoardArticle(user, article?.userId, 'DELETE');

  // 감사 P1-5/P1-6: 첨부 영역은 과거 "Technical_Spec_Unit_XXXX.pdf · 3.4 MB" 라는 존재하지 않는 파일을
  // 하드코딩해 보여주고, 다운로드 아이콘에는 핸들러조차 없었다. 이미 있는 fileService 로 실제 목록을 배선한다.
  const atchFileSn = article?.atchFileSn;
  const {
    data: attachments = [],
    isError: isAttachmentError,
    refetch: refetchAttachments,
  } = useQuery({
    queryKey: ['article-files', atchFileSn],
    queryFn: () => fileService.getFileList(atchFileSn!),
    enabled: !!atchFileSn,
  });

  const tmpltId = masterInfo?.tmpltId || 'TMPLT_LIST';

  const createScrapMutation = useMutation(scrapMutationOptions.create(queryClient));

  // 게시글 추천(좋아요) — 낙관적 UI: 클릭 즉시 카운트 증가 후 서버 반영(실패 시 롤백)
  const [likeDelta, setLikeDelta] = useState(0);
  // React state 반영 전 같은 tick의 추천/삭제/스크랩 재진입까지 막기 위해 ref를 먼저 선점한다.
  const actionPendingRef = React.useRef(false);
  const [activeAction, setActiveAction] = useState<'like' | 'delete' | 'scrap' | 'solve' | null>(null);

  /*
    [2026-09-25 DIP I3] Q&A 해결 표시. 해결 상태 컬럼과 목록의 배지는 있었지만 SOLVED 로 바꾸는 경로가 없어
    답을 받은 질문도 계속 '접수' 로 남았다. 작성자·전체 수정 권한자에게만 보이며 서버가 다시 판정한다.
  */
  const canMarkSolved = tmpltId === 'TMPLT_QNA' && article?.qnaSttsCd !== 'SOLVED' && canUpdateArticle;
  const handleMarkSolved = async () => {
    if (actionPendingRef.current || !bbsId || !hasValidPstSn) return;
    actionPendingRef.current = true;
    setActiveAction('solve');
    try {
      await boardUserService.markQuestionSolved(bbsId, pstSn);
      await queryClient.invalidateQueries({ queryKey: ['article-detail', bbsId, pstSn] });
      toast('질문을 해결됨으로 표시했습니다.', 'success');
    } catch (solveError) {
      toast(extractErrorMessage(solveError, '해결 표시 중 오류가 발생했습니다.'), 'error');
    } finally {
      actionPendingRef.current = false;
      setActiveAction(null);
    }
  };
  const handleLike = async () => {
    if (actionPendingRef.current || !bbsId || !hasValidPstSn) return;
    actionPendingRef.current = true;
    setActiveAction('like');
    setLikeDelta((d) => d + 1);
    try {
      await boardUserService.likePost(bbsId, pstSn);
    } catch (likeError) {
      setLikeDelta((d) => d - 1);
      // 이미 추천했거나(409) 읽을 수 없는 글이면(403·404) 서버가 사유를 말한다(DIP I6 ④).
      toast(extractErrorMessage(likeError, '추천 처리 중 오류가 발생했습니다.'), 'error');
    } finally {
      actionPendingRef.current = false;
      setActiveAction(null);
    }
  };

  // 저장에 성공하면 같은 화면에서 다시 누르지 못하게 잠근다. 서버·스키마에 (사용자, URL) 유일성
  // 제약이 없어 누를 때마다 보관함 행이 하나씩 늘기 때문이다. 새로고침하면 풀리므로 "이번 방문에서
  // 저장했다" 이상은 주장하지 않는다 — 중복 제거를 서버 계약처럼 말하지 않기 위해서다.
  const [isScrapped, setScrapped] = useState(false);

  const handleScrap = async () => {
    if (actionPendingRef.current || isScrapped || !bbsId || !hasValidPstSn || !article) return;
    actionPendingRef.current = true;
    setActiveAction('scrap');
    try {
      const currentPath = `/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`;
      // scrapNm 은 물리 컬럼 varchar(100). 지식 항목명(knoNm)처럼 더 긴 값이 올 수 있어 잘라 보낸다
      // — 넘기면 서버가 400 을 주는데, 스크랩은 사용자가 길이를 조절할 수 있는 입력이 아니다.
      const title = (article.pstTtl || article.knoNm || '게시글 스크랩').slice(0, 100);
      await createScrapMutation.mutateAsync({
        scrapNm: title,
        scrapUrl: currentPath,
        scrapExpln: `${masterInfo?.bbsTtl || '게시판'} - ${title}`.slice(0, 4000),
        useYn: 'Y',
      });
      setScrapped(true);
      toast('게시글을 스크랩 보관함에 저장했습니다.', 'success');
    } catch (error) {
      toast(extractErrorMessage(error, '스크랩 저장 중 오류가 발생했습니다.'), 'error');
    } finally {
      actionPendingRef.current = false;
      setActiveAction(null);
    }
  };

  const handleDelete = async () => {
    if (actionPendingRef.current) return;
    actionPendingRef.current = true;
    setActiveAction('delete');
    try {
      const isConfirmed = await confirm({
        title: '게시글 삭제',
        message: `[${article?.pstTtl || '제목 없음'}] 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
        confirmText: '삭제',
        variant: 'destructive'
      });
      if (!isConfirmed) return;

      const formData = new FormData();
      formData.append('bbsId', bbsId ?? '');
      formData.append('pstSn', String(pstSn));

      const res = await deleteBoardArticle(null, formData);
      if (res.success) {
        toast('게시글이 삭제되었습니다.', 'success');
        queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] });
        router.push(`/admin/community/boards/select-board-list?bbsId=${bbsId}`);
      } else {
        toast(res.message || '게시글 삭제에 실패했습니다.', 'error');
      }
    } catch {
      toast('게시글 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      actionPendingRef.current = false;
      setActiveAction(null);
    }
  };

  // 감사 P1-1: 조회 장애(fetchError)와 '실제로 없는 글'(404)을 구분해 표시한다.
  if (!article && initialData.fetchError) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center min-h-[600px] space-y-6 text-center px-6">
        <AlertTriangle size={48} className="text-destructive-emphasis" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">게시글을 불러오지 못했습니다</h1>
          <p className="text-sm font-medium text-muted-foreground max-w-md">{initialData.fetchError}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.refresh()}>다시 시도</Button>
          <Button variant="outline" onClick={() => router.back()}>목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
        <h1 className="text-[length:var(--font-size-body)] font-semibold text-foreground">게시글을 찾을 수 없습니다. 삭제되었거나 주소가 올바르지 않습니다.</h1>
        <Button onClick={() => router.back()} aria-label="뒤로 가기">목록으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[var(--page-max-w)] space-y-4 pb-6">
      {/* --- Action Header --- */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-auto gap-1.5 px-0 text-muted-foreground hover:bg-transparent hover:text-primary"
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="text-[length:var(--font-size-body)]">목록으로</span>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-medium text-primary">
              {masterInfo?.bbsTtl || '게시판'}
            </Badge>
            <span className="text-xs tabular-nums text-muted-foreground">게시글 번호: {pstSn}</span>
          </div>
          <h1 className="text-xl font-bold leading-snug tracking-tight text-foreground">
            {article.pstTtl || article.knoNm}
          </h1>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canMarkSolved && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkSolved}
              disabled={activeAction !== null}
              aria-busy={activeAction === 'solve'}
              className="gap-1.5"
            >
              {activeAction === 'solve' ? '표시하는 중…' : '해결됨으로 표시'}
            </Button>
          )}
          {canUpdateArticle && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/community/boards/insert-board-article?bbsId=${bbsId}&pstSn=${pstSn}`)}
              className="gap-1.5"
              aria-label="게시글 수정"
            >
              <Edit3 size={16} className="text-primary" aria-hidden="true" /> 수정
            </Button>
          )}
          {/*
            [2026-08-28] '답글' 버튼 제거.

            이 버튼은 등록 화면으로 parnts·replyYn 을 실어 보냈고, 등록 화면은 그 두 값을
            그대로 요청 본문에 넣었다. 그런데 BoardSaveRequest 에는 두 필드가 없고
            application.yml 이 fail-on-unknown-properties: true 라 **요청이 항상 400** 이었다.
            사용자는 제목·본문을 다 쓰고 '등록' 을 눌러도 재시도 안내만 받았고, 몇 번을 눌러도
            성공하지 않았다.

            엔드포인트를 여는 대신 어포던스를 걷은 이유: BoardService.replyPost 는 실재하지만
            **화면에 답글 계층 표현이 전혀 없다** — 목록·상세 어디도 upPstSn·ansLv 를 읽지
            않는다(전수 grep 0건). 지금 엔드포인트만 열면 답글이 일반 글과 구분되지 않는
            반쪽 기능이 된다. 서버 구현은 남겨 둔다(요청 밖 삭제 금지) — 계층 표현과 함께
            설계할 때 되살릴 자산이다.
          */}
          <Button
            variant="outline"
            onClick={handleLike}
            disabled={activeAction !== null}
            aria-busy={activeAction === 'like' || undefined}
            aria-label={activeAction === 'like' ? '게시글 추천 처리 중' : '게시글 추천'}
            size="sm"
            className="gap-1.5"
          >
            <ThumbsUp size={16} className="text-primary" aria-hidden="true" /> 추천 {(article.likeCnt ?? 0) + likeDelta}
          </Button>
          <Button
            variant="outline"
            onClick={handleScrap}
            disabled={activeAction !== null || isScrapped}
            aria-busy={activeAction === 'scrap' || undefined}
            aria-label={activeAction === 'scrap' ? '게시글 스크랩 보관 중' : isScrapped ? '게시글 스크랩됨' : '게시글 스크랩'}
            size="sm"
            className="gap-1.5"
          >
            <Bookmark size={16} className="text-primary" aria-hidden="true" /> {isScrapped ? '스크랩됨' : '스크랩'}
          </Button>
          {/*
            감사 P1-9: native confirm() → useConfirm(변형 destructive).
            본문에 대상 게시글 제목을 노출하고, 실패(res.success === false)도 삼키지 않고 토스트로 드러낸다.
          */}
          {/*
            [2026-07-27 결함 수정] 종전에는 `<form action={async (fd) => { await confirm(...) ... }}>` 였고,
            그 구조에서는 **삭제가 전혀 동작하지 않았다.** React 19 의 form action 은 transition 으로
            실행되는데, `confirm()` 이 일으키는 모달 open state 갱신이 그 transition 에 묶인다. 액션은
            모달의 응답을 기다리고, 모달의 렌더는 액션이 끝나야 커밋되므로 서로를 막는 **교착**이 된다.
            실측(프로덕션 빌드): 클릭 시 액션 진입 로그는 찍히는데 dialog 는 0개, 재클릭·requestSubmit
            모두 동일. 콘솔 오류도 없어 "눌러도 아무 일이 없는" 증상으로만 드러났다.
            → 확인을 transition 밖(onClick)에서 먼저 받고, 확정된 뒤에 서버 액션을 호출한다.
              폼이 없어졌으므로 FormData 는 직접 구성한다(종전 hidden input 과 동일한 키).
          */}
          {canDeleteArticle && (
            <Button
              type="button"
              variant="outline"
              disabled={activeAction !== null}
              onClick={() => { void handleDelete(); }}
              aria-busy={activeAction === 'delete' || undefined}
              size="sm"
              className="gap-1.5 border-destructive/40 text-destructive-emphasis hover:bg-destructive/10"
              aria-label={activeAction === 'delete' ? '게시글 삭제 중' : '게시글 삭제'}
            >
              {/* 아이콘만 있는 파괴적 버튼은 무엇이 지워지는지 말하지 않는다 — 라벨을 함께 둔다. */}
              <Trash2 size={16} aria-hidden="true" /> 삭제
            </Button>
          )}
        </div>
      </div>

      {/* --- Meta Info Bar --- */}
      {/* 감사 P1-5: 'Integrity: Verified Node' 는 어떤 검증도 수행하지 않는 고정 문구라 카드 자체를 삭제하고,
          실제 응답 필드로 계산 가능한 3개만 남긴다. */}
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-border bg-card px-3 py-2">
        <MetaItem icon={<User size={14} />} label="작성자" value={article.userNm || '-'} />
        <MetaItem icon={<Calendar size={14} />} label="등록일" value={article.crtDt || '-'} />
        <MetaItem icon={<Eye size={14} />} label="조회수" value={`${(article.inqCnt || 0).toLocaleString()}회`} />
      </dl>

      {/* --- CONTENT AREA --- */}
      <section aria-label="본문" className="rounded-md border border-border bg-card p-4 md:p-6">
        <h2 className="mb-3 flex items-center gap-2 border-b border-border pb-2 text-[length:var(--font-size-body)] font-semibold text-muted-foreground">
          <Quote size={14} className="text-primary" aria-hidden="true" />
          {tmpltId === 'TMPLT_QNA' ? (article.qnaCatCd || 'Q&A') : '본문'}
        </h2>

        <div
          className={cn(
            "prose dark:prose-invert max-w-none text-foreground",
            "leading-relaxed",
            "prose-headings:font-semibold prose-headings:text-foreground",
            "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:not-italic prose-blockquote:text-foreground",
            "prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-pre:bg-surface-inverse prose-pre:rounded-md"
          )}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.pstCn || article.knoCn || '') }}
        />
      </section>

      {/* --- 첨부파일 --- */}
      {atchFileSn && (
        <section aria-label="첨부파일" className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 border-b border-border pb-2 text-[length:var(--font-size-body)] font-semibold text-foreground">
            <Package size={14} className="text-primary" aria-hidden="true" />
            첨부파일 {attachments.length > 0 ? `${attachments.length}건` : ''}
          </h2>

          {isAttachmentError ? (
            <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
              <span className="text-[length:var(--font-size-body)] text-foreground">첨부파일 목록을 불러오지 못했습니다.</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void refetchAttachments()}>
                다시 시도
              </Button>
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-[length:var(--font-size-body)] text-muted-foreground">등록된 첨부파일이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-border">
              {attachments.map((file) => (
                <li key={`${file.atchFileSn}-${file.fileSn}`}>
                  <button
                    type="button"
                    onClick={() => {
                      // 인증 axios 로 바이트를 받으므로 실패할 수 있다. 조용히 삼키면
                      // 사용자는 아무 일도 일어나지 않은 것으로 오해한다.
                      fileService
                        .downloadFile(file.atchFileSn, file.fileSn, file.orignlFileNm)
                        .catch(() => toast('첨부파일을 내려받지 못했습니다.', 'error'));
                    }}
                    aria-label={`${file.orignlFileNm} 다운로드`}
                    className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText size={16} className="shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-[length:var(--font-size-body)] text-foreground">{file.orignlFileNm}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatFileSize(file.fileMg)}{file.fileExtsn ? ` · ${file.fileExtsn.toUpperCase()}` : ''}
                        </span>
                      </span>
                    </span>
                    <Download size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* --- Comments Section --- */}
      <div>
        <CommentSection
          bbsId={bbsId!}
          pstSn={pstSn}
          initialComments={initialData.initialComments}
        />

        {/* D-8 만족도 — 백엔드는 #302 에서 배선됐고 이 위젯이 그 짝을 맞춘다 */}
        <SatisfactionSection bbsId={bbsId!} pstSn={pstSn} />
      </div>
    </div>
  );
}

/** 바이트 단위 파일 크기를 사람이 읽는 표기로 변환한다. */
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '크기 정보 없음';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground" aria-hidden="true">{icon}</span>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-[length:var(--font-size-body)] font-medium text-foreground">{value}</dd>
    </div>
  );
}
