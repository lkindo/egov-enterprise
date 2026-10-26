'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
/* reusable-base:help:start */
import Link from 'next/link';
/* reusable-base:help:end */
import {
  ArrowLeft, Save, Loader2,
  Paperclip, Trash2, Calendar
} from 'lucide-react';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import type { BoardMeta } from '@/services/business/user/board/BoardUserService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/app/components/ui/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { saveBoardArticle } from '@/app/actions/boardActions';
import dynamic from 'next/dynamic';
import { useAutoSaveDraft } from '@/hooks/use-auto-save-draft';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppForm } from '@/hooks/useAppForm';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormErrorSummary,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { canEditConfiguredBoard } from '@/lib/auth/board-edit-permissions';
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { boardMasterQueryOptions } from '@/queries/board-master-query-options';
import { boardUploadLimits, formatMegabytes, BOARD_UPLOAD_ACCEPT, BOARD_UPLOAD_EXTENSIONS } from '@/lib/attachments/server-upload-limits';
import { fileService } from '@/services/foundation/file/FileService';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { htmlToSemanticPlainText } from '@/lib/html-to-text';
import { createBoardMediaFile, getBoardMediaKind, getBoardMediaReferences, type BoardMediaReference } from '@/lib/attachments/board-media';
import type { RichTextMediaOptions } from '@/components/ui/RichTextMedia';
import { useWatch } from 'react-hook-form';
import { getBoardDraftEpoch } from '@/lib/drafts/board-draft-storage';
import { fromDateInputValue } from '@/lib/format-date';
import type { BoardPostingStatus } from '@/types/business/board';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />
});

import { BoardSaveRequestSchema } from '@/types/generated-zod';

/**
 * [2026-10-26 ADR-0043 1차 UX-08] 본문 상한. 서버(BoardSaveRequest.pstCn @Size)는 편집기가 만든 HTML 문자열의 길이를 센다 — 굵게·표
 * 같은 서식 태그도 글자 수에 든다. 종전에는 이 단위를 숨긴 채 넘으면 오류만 보였다. 값은 생성 스키마에서 읽고 문구만 화면이 정한다
 * (도움말 문의 폼과 같은 방식). JavaScript 문자열 길이와 Java String.length 는 둘 다 UTF-16 단위라 같은 수를 센다.
 */
const CONTENT_MAX = BoardSaveRequestSchema.shape.pstCn.maxLength ?? 4000;
const CONTENT_MAX_TEXT = CONTENT_MAX.toLocaleString('ko-KR');
/** 한 번 저장할 때 새로 올리는 파일 전체 크기 상한(MB) — 서버 multipart max-request-size(application.yml)와 같다. */
const SAVE_TOTAL_MAX_MB = 50;

/*
  [2026-10-23 ADR-0040 D12] 게시 기간 폼 값은 저장 포맷(yyyyMMdd)이고 생성 Zod(@Pattern Ymd)가 형식·달력을 본다. 시작≤종료는 서버의
  클래스 단위 @YmdRange 라 생성 스키마로 내려오지 않아 여기서 같은 규칙을 둔다. 오늘과의 비교(예약 설정·공개 뒤 시작일 변경)는
  하지 않는다 — 서버가 오늘(Asia/Seoul) 기준으로 판정하고 그 사유를 해당 날짜 칸에 붙인다(D-11, DEC-OPS-140).
*/
const boardSchema = BoardSaveRequestSchema.extend({
  pstSn: z.coerce.number().int().positive().optional(),
  pstCn: z.string()
    .min(1, '내용을 입력해 주세요.')
    .max(CONTENT_MAX, `본문은 서식을 포함해 ${CONTENT_MAX_TEXT}자까지 저장할 수 있습니다. 내용이나 서식(표·굵게 등)을 줄여 주세요.`)
    .refine((value) => htmlToSemanticPlainText(value).length > 0 || getBoardMediaReferences(value).length > 0, '내용을 입력해 주세요.'),
}).superRefine((value, context) => {
  const start = value.pstBgngYmd ?? '';
  const end = value.pstEndYmd ?? '';
  if (/^\d{8}$/.test(start) && /^\d{8}$/.test(end) && start > end) {
    context.addIssue({ code: 'custom', path: ['pstEndYmd'], message: '종료일은 시작일과 같거나 뒤여야 합니다.' });
  }
});

type BoardFormValues = z.infer<typeof boardSchema>;
/*
  qnaSttsCd 는 폼이 보내지 않는 값이다(해결 표시는 상세의 별도 동작). 저장 요청 스키마가 그 값 도메인(OPEN·SOLVED)을 좁힌 뒤에도 상세 응답의
  문자열을 초기값으로 그대로 받게 저장 요청 타입에서 뺀다(2026-10-26 ADR-0043 0차 — 서버가 Q&A 상태값의 범위를 검사한다).
*/
type BoardInitialData = Omit<Partial<BoardFormValues>, 'version' | 'qnaSttsCd'> & {
  qnaSttsCd?: string | null;
  // 상세 응답의 소유자 키이며 저장 요청 필드가 아니다.
  userId?: string;
  userNm?: string;
  pswd?: string;
  /** 게시글 버전(ADR-0040 결정 10). 수정 저장에 그대로 돌려보낸다 — 다르면 서버가 409 로 거부한다. */
  version?: number | null;
  /** 서버 판정 게시 상태(ADR-0040 결정 3). 공개된 글의 시작일을 잠글지 정한다 — 날짜를 다시 계산하지 않는다. */
  postingStatus?: BoardPostingStatus | null;
};

interface BoardRegistClientProps {
  initialData?: BoardInitialData | null;
  bbsId: string;
  pstSn?: number;
}

type AttachmentItem = Awaited<ReturnType<typeof fileService.getFileList>>[number];

/**
 * 서버가 돌려주는 날짜 문자열을 `<input type="date">` 값(yyyy-MM-dd)으로 맞춘다.
 * 게시 기간은 `yyyyMMdd` 로 저장되고(BoardPolicySupport.normalizeYmd), 행사 일자는 LocalDateTime 문자열이라
 * 앞 10자만 쓴다. 해석할 수 없으면 비워 둔다 — 비운 값은 서버 액션이 undefined 로 정규화해
 * 기존 값을 유지한다(BoardService.updatePost 의 부분 갱신 계약).
 */
function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return '';
}

/** 게시 기간의 저장 포맷(yyyyMMdd). 해석할 수 없는 옛 값은 비운다 — 수정 저장에서 빈 값은 서버가 '변경 없음' 으로 본다(D-19). */
function toPostingYmd(value?: string | null): string {
  return fromDateInputValue(toDateInputValue(value));
}

/*
  [2026-10-26 ADR-0043 1차 UX-09] 게시 기간 두 칸은 접힌 '게시 기간 설정' 안에 둔다(대부분의 글은 정하지 않는다). 행사 일자는 캘린더
  화면 유형만 쓰는 값이라(달력이 행사 일자, 없으면 등록일로 글을 놓는다 — BoardTemplates) 그 게시판에서만 보인다. 다른 게시판에서는
  칸을 감추되 이미 저장된 값은 그대로 보낸다(지우지 않는다).
*/
const PERIOD_FIELDS = [
  { name: 'pstBgngYmd', label: '게시 시작일' },
  { name: 'pstEndYmd', label: '게시 종료일' },
] as const;
const PERIOD_FIELD_NAMES: readonly string[] = PERIOD_FIELDS.map((field) => field.name);
/** 캘린더 화면 유형의 템플릿(board-types.ts 정본). 행사 일자 칸은 이 게시판에서만 보인다. */
const CALENDAR_TEMPLATE_ID = 'TMPLT_CALENDAR';

/**
 * 공개 범위의 근거가 되는 게시판 메타. 이용자 메타(BoardMetaDto)는 `community` 를 싣는다 — 귀속이 없으면 null, 있으면 커뮤니티 요약
 * (이름을 모르면 이름만 비운다). 옛 응답처럼 필드가 없으면 귀속 여부를 추정하지 않는다.
 */
type AudienceMeta = Pick<BoardMeta, 'prvtPstPlcyCd'> & { community?: { cmntyNm?: string | null } | null };

/**
 * [2026-10-26 ADR-0043 1차 UX-09] 이 글을 보는 사람(머리 안내의 주어). 서버가 집행하는 범위만 말한다 — 비밀글은 작성자와 게시판
 * 관리자(조회 대행 권한)만, 커뮤니티 귀속 게시판은 그 커뮤니티의 승인 회원과 게시판 관리자만, 그 밖은 로그인한 모든 사용자다
 * (BoardPredicate·CommunityBoardAccessPort). 메타가 커뮤니티 귀속을 말하지 않으면 '이 게시판을 열 수 있는 모든 사용자' 라고 한다 —
 * 귀속 게시판이면 회원만 열 수 있으므로 어느 쪽이든 사실이다. 메타를 모르면 말하지 않는다.
 */
function articleAudience(meta: AudienceMeta | null | undefined, secret: boolean): string | null {
  if (!meta) return null;
  if (secret) return '작성자와 게시판 관리자만';
  if (!('community' in meta)) return '이 게시판을 열 수 있는 모든 사용자가';
  if (meta.community) {
    const name = meta.community.cmntyNm?.trim();
    return `${name ? `${name} ` : ''}커뮤니티 회원과 게시판 관리자가`;
  }
  return '로그인한 모든 사용자가';
}

/** 접힌 게시 기간의 요약(저장 포맷 yyyyMMdd → yyyy-MM-dd). */
function postingPeriodSummary(start?: string, end?: string): string {
  const from = toDateInputValue(start);
  const to = toDateInputValue(end);
  if (from && to) return `${from}부터 ${to}까지`;
  if (from) return `${from}부터`;
  if (to) return `${to}까지`;
  return '정하지 않음';
}

function RichTextFieldControl({
  value,
  onChange,
  media,
  readOnly,
}: {
  value: string;
  onChange: (value: string) => void;
  media: RichTextMediaOptions;
  readOnly: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { error, formMessageId, name } = useFormField();

  useEffect(() => {
    const syncAccessibility = () => {
      const editor = containerRef.current?.querySelector<HTMLElement>('.ProseMirror');
      if (!editor) return;
      editor.dataset.errorFocus = name;
      editor.dataset.formFieldName = name;
      editor.setAttribute('aria-required', 'true');
      if (error) {
        editor.setAttribute('aria-invalid', 'true');
        editor.setAttribute('aria-errormessage', formMessageId);
      } else {
        editor.setAttribute('aria-invalid', 'false');
        editor.removeAttribute('aria-errormessage');
      }
    };

    syncAccessibility();
    const observer = new MutationObserver(syncAccessibility);
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }
    return () => observer.disconnect();
  }, [error, formMessageId, name]);

  return (
    <div
      ref={containerRef}
      className="rounded-[2.5rem] overflow-hidden border-2 border-border bg-card shadow-2xl"
      data-testid="rich-text-editor"
    >
      <FormControl>
        <RichTextEditor
          enableTables
          media={media}
          readOnly={readOnly}
          value={value}
          onChange={onChange}
          placeholder="내용을 입력하세요..."
          aria-label="게시글 본문 내용 (필수)"
        />
      </FormControl>
    </div>
  );
}

export function BoardRegistClient({ initialData, bbsId, pstSn }: BoardRegistClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const activeRecordId = pstSn ?? initialData?.pstSn;

  /*
   * [2026-09-05 DEC-OPS-034] 첨부는 두 갈래다.
   *  - 새 파일: 저장 시 서버 액션 FormData 의 `files` 로 실어 보낸다. 서버 액션은 이미 그 키를 읽어
   *    multipart(`/boards/{bbsId}/posts/with-files`)로 넘기고 있었지만 이 화면에는 파일 입력이 없어 한 번도 실린 적이 없었다.
   *  - 기존 파일(수정 모드): 목록을 보여 주고 건별로 지운다. 삭제 인가는 서버(FileAccessPolicy#assertDeletable)
   *    가 판정하므로 화면은 결과만 정직하게 보여 준다 — 거부(403)는 토스트로 드러낸다.
   */
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const mediaScope = `${user?.esntlId ?? user?.id ?? ''}:${bbsId}:${activeRecordId ?? 'new'}:${getBoardDraftEpoch()}`;
  const [mediaCache, setMediaCache] = useState<{ scope: string; files: File[] }>({ scope: mediaScope, files: [] });
  const pendingMediaFiles = mediaCache.scope === mediaScope ? mediaCache.files : [];
  const [deletingFileKey, setDeletingFileKey] = useState<string | null>(null);
  // 같은 tick 의 연속 클릭은 state 갱신보다 먼저 들어오므로 동기 ref 로 잠근다(폼 검증 census 의 destructive action 계약).
  const deletingRef = useRef(false);
  // 사용자 범위가 준비되면 기존 초안을 한 번만 확인한다. 이후 자기 자동저장분은 다시 묻지 않는다.
  const draftPromptedRef = useRef(false);
  const [draftRestorePending, setDraftRestorePending] = useState(true);
  const existingAtchFileSn = initialData?.atchFileSn ?? undefined;
  const {
    data: attachments = [],
    isError: isAttachmentError,
    refetch: refetchAttachments,
  } = useQuery({
    queryKey: ['article-files', existingAtchFileSn],
    queryFn: () => fileService.getFileList(existingAtchFileSn!),
    enabled: !!existingAtchFileSn,
  });

  const attachmentKey = (file: AttachmentItem) => `${file.atchFileSn}-${file.fileSn}`;

  /*
   * [2026-09-27 DIP B5 F9] 게시판 첨부 설정(허용·파일 수·파일당 크기)을 업로더에 그대로 보인다. 서버
   * (BoardPolicySupport.assertNewFilesAllowed)가 같은 규칙으로 저장 전에 거부하므로, 화면이 더 많이 받아 두면 저장할 때에야 실패한다.
   * 설정을 아직 모르면 서버 상한으로 보이고 판정은 서버가 한다.
   */
  const { data: boardMeta, isError: isBoardMetaError, refetch: refetchBoardMeta } = useQuery(boardMasterQueryOptions.meta(bbsId ?? ''));
  const canWrite = canEditConfiguredBoard(user, boardMeta) && (activeRecordId
    ? canPermission(user, 'BOARD_UPDATE') && (canPermission(user, 'BOARD_UPDATE_ALL')
      || Boolean(user?.esntlId && initialData?.userId === user.esntlId))
    : canPermission(user, 'BOARD_CREATE'));
  const uploadLimits = boardUploadLimits(boardMeta, attachments.length);
  /*
    [2026-10-23 ADR-0040 결정 3] 게시가 시작된 글의 시작일은 게시글 전체 수정 권한이 있어야 바꾼다(정렬 조작 방지). 서버 판정 게시 상태가
    예약이 아니면 잠근다 — 상태를 모르면 잠근 쪽이다. 같은 값을 다시 보내는 것은 변경이 아니므로 readOnly 로 두어 값을 그대로 보낸다.
    서버가 최종 판정한다(BoardPolicySupport.assertStartDateChangeAllowed).
  */
  const startDateLocked = Boolean(activeRecordId) && initialData?.postingStatus !== 'SCHEDULED'
    && !canPermission(user, 'BOARD_UPDATE_ALL');
  const reservationClosed = boardMeta?.rsvtPstgPsbltyYn === 'N';
  /*
    [2026-10-23 ADR-0040 결정 7] 비밀글 정책. 선택(OPTIONAL)이면 '비밀글로 쓰기' 를 둔다. 필수(REQUIRED)면 서버가 늘 비밀글로 저장하므로
    선택을 두지 않고 그 사실만 말한다 — 공개된 글을 고치는 중이면 저장하면 비밀글로 바뀐다고 알린다(BoardPolicySupport.resolveSecretYn).
    없음(NONE)이면 아무것도 두지 않고 저장값을 그대로 보낸다 — 도움말 1:1 문의의 비밀글이 공개로 바뀌지 않는다. 메타를 모르면 없음과
    같다(판정은 서버가 한다).
  */
  const privatePostPolicy = boardMeta?.prvtPstPlcyCd;
  const editingPublicPost = Boolean(activeRecordId) && initialData?.scrtYn !== 'Y';

  const handleDeleteAttachment = async (file: AttachmentItem) => {
    if (!canWrite || deletingRef.current) return;
    if ([...getBoardMediaReferences(form.getValues('pstCn')), ...getBoardMediaReferences(initialData?.pstCn ?? '')]
      .some((reference) => reference.name === file.orignlFileNm)) {
      toast('본문에서 사용하는 파일입니다. 본문에서 먼저 제거하고 게시글을 저장한 뒤 첨부파일을 삭제해 주세요.', 'error');
      return;
    }
    deletingRef.current = true;
    const key = attachmentKey(file);
    setDeletingFileKey(key);
    try {
      const confirmed = await confirm({
        title: '첨부파일 삭제',
        message: `'${file.orignlFileNm}' 파일을 삭제합니다. 삭제한 파일은 복구할 수 없습니다.`,
        confirmText: '삭제',
        variant: 'destructive',
      });
      if (!confirmed) return;

      await fileService.deleteFile(file.atchFileSn, file.fileSn);
      toast('첨부파일을 삭제했습니다.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['article-files', file.atchFileSn] });
    } catch (error) {
      toast(extractErrorMessage(error, '첨부파일을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'), 'error');
    } finally {
      deletingRef.current = false;
      setDeletingFileKey(null);
    }
  };
  const draftScope = useMemo(() => user ? {
    ownerId: user.esntlId ?? user.id,
    boardId: bbsId,
    action: activeRecordId ? 'update' as const : 'create' as const,
    recordId: activeRecordId ? String(activeRecordId) : 'new',
  } : null, [activeRecordId, bbsId, user]);

  // 게시 기간을 이미 정한 글(수정)은 펼친 채로 연다 — 접힌 칸 안의 값을 놓치지 않게 한다.
  const [periodOpen, setPeriodOpen] = useState(() => Boolean(toPostingYmd(initialData?.pstBgngYmd) || toPostingYmd(initialData?.pstEndYmd)));
  const form = useAppForm(boardSchema, {
    defaultValues: {
      bbsId: bbsId,
      pstSn: pstSn || initialData?.pstSn,
      pstTtl: initialData?.pstTtl || '',
      pstCn: initialData?.pstCn || '',
      userNm: initialData?.userNm || '관리자',
      // 기존 글에 첨부가 없으면 API는 null을 반환한다. 생성 스키마의 optional()은
      // undefined만 허용하므로 수정 폼 경계에서 null을 제거한다.
      atchFileSn: initialData?.atchFileSn ?? undefined,
      scrtYn: initialData?.scrtYn || 'N',
      useYn: initialData?.useYn || 'Y',
      pstBgngYmd: toPostingYmd(initialData?.pstBgngYmd),
      pstEndYmd: toPostingYmd(initialData?.pstEndYmd),
      evntDt: toDateInputValue(initialData?.evntDt),
      // [2026-10-23 ADR-0040 결정 10] 수정 저장은 읽은 버전을 싣는다(새 글에는 없다).
      version: initialData?.version ?? undefined,
    } as BoardFormValues
  }, {
    // 오류 요약에서 게시 기간 칸으로 갈 때 접힌 '게시 기간 설정' 을 먼저 편다 — 닫힌 칸에는 초점을 줄 수 없다.
    revealField: (fieldName) => {
      if (PERIOD_FIELD_NAMES.includes(fieldName)) setPeriodOpen(true);
    },
  });

  /*
    [2026-10-26 ADR-0043 1차 UX-07] 앱 공통 미저장 보호. 종전에는 이 화면만 빠져 있어 '뒤로 가기'·'취소'(방문 기록 이동)와 메뉴 이동에서
    묻지 않았고, 돌아오면 제목·본문은 탭 메모리에서 되살렸지만 게시 기간·비밀 선택·일반 첨부는 잃었다. 고친 입력이나 새 첨부가 있으면
    앱 안 이동 전에 묻고, 저장 중에는 이동을 막는다. 저장에 성공하면 이동(router.replace) 전에 해제한다 — 그래야 보호가 저장 직후의
    이동을 '저장하지 않은 변경' 으로 묻지 않는다. 브라우저 영속 저장소에는 쓰지 않는다(헌법 제4조 3항).
    새로고침·탭 닫기는 공통 보호와 초안 훅(useAutoSaveDraft)의 beforeunload 가 함께 걸리지만 브라우저는 한 이동에 이탈 확인을 한 번만
    띄운다. 앱 안 이동의 확인은 공통 보호 하나만 띄운다(초안 훅은 앱 안 이동을 보지 않는다).
  */
  const { isDirty } = form.formState;
  const savedRef = useRef(false);
  const hasNewFiles = newFiles.length > 0;
  useUnsavedChanges(() => ({
    dirty: !savedRef.current && (isDirty || hasNewFiles || pendingMediaFiles.length > 0),
    pending: submittingRef.current && !savedRef.current,
  }));

  const currentContent = useWatch({ control: form.control, name: 'pstCn' }) ?? '';
  /*
    [2026-10-26 ADR-0043 1차 UX-08] 본문 길이를 서버와 같은 단위(서식 포함 HTML 길이)로 보인다. 상한을 넘거나 다시 들어올 때 그 칸을
    검사해 오류를 칸에 바로 붙이고 지운다 — 저장을 눌러서야 알게 하지 않는다. 매 글자마다 검사하지는 않는다.
  */
  const contentLength = currentContent.length;
  const contentTooLong = contentLength > CONTENT_MAX;
  const contentTooLongRef = useRef(false);
  useEffect(() => {
    if (contentTooLong === contentTooLongRef.current) return;
    contentTooLongRef.current = contentTooLong;
    void form.trigger('pstCn');
  }, [contentTooLong, form]);
  const secretSelected = useWatch({ control: form.control, name: 'scrtYn' }) === 'Y';
  const postingStart = useWatch({ control: form.control, name: 'pstBgngYmd' }) ?? '';
  const postingEnd = useWatch({ control: form.control, name: 'pstEndYmd' }) ?? '';
  const periodHasError = Boolean(form.formState.errors.pstBgngYmd || form.formState.errors.pstEndYmd);
  const referencedMediaNames = new Set(getBoardMediaReferences(currentContent).map((reference) => reference.name));
  const selectedMediaFiles = pendingMediaFiles.filter((file) => referencedMediaNames.has(file.name));

  const addMediaFiles = (files: File[]): BoardMediaReference[] => {
    if (!canWrite || isSubmitting || !uploadLimits.allowed || files.length === 0) return [];
    if (files.some((file) => !getBoardMediaKind(file.name) || file.size === 0 || file.size > uploadLimits.maxSizeMB * 1024 * 1024)) {
      toast(`이미지(JPG, PNG, GIF, BMP) 또는 영상(MP4, WebM)을 선택해 주세요. 파일 하나당 ${formatMegabytes(uploadLimits.maxSizeMB)}까지 첨부할 수 있습니다.`, 'error');
      return [];
    }
    const allFiles = [...newFiles, ...selectedMediaFiles, ...files];
    if (allFiles.length > uploadLimits.remaining || allFiles.reduce((sum, file) => sum + file.size, 0) > SAVE_TOTAL_MAX_MB * 1024 * 1024) {
      toast(`일반 첨부와 본문 미디어를 합친 파일 수 또는 전체 크기(${SAVE_TOTAL_MAX_MB}MB)가 허용 범위를 넘습니다.`, 'error');
      return [];
    }
    const additions = files.map(createBoardMediaFile);
    setMediaCache({ scope: mediaScope, files: [...pendingMediaFiles, ...additions.map((item) => item.file)] });
    return additions.map((item) => item.reference);
  };

  // 자동 임시저장 훅 연동
  const { restoreDraft, clearDraft, hasDraft, lastSavedAt, peekDraft } = useAutoSaveDraft({
    scope: draftScope,
    enabled: !draftRestorePending,
    getData: () => ({
      title: form.getValues('pstTtl'),
      content: form.getValues('pstCn')
    }),
    getFiles: () => selectedMediaFiles,
    onRestoreFiles: (files) => setMediaCache({ scope: mediaScope, files }),
    // 되살린 초안도 아직 저장하지 않은 입력이다 — 미저장 보호가 보도록 고친 값으로 둔다(UX-07).
    onRestore: (data) => {
      form.setValue('pstTtl', data.title, { shouldDirty: true });
      form.setValue('pstCn', data.content, { shouldDirty: true });
    }
  });

  // 페이지 진입 시 임시저장 데이터 확인 및 복구 제안
  //   [2026-09-05] native confirm() → useConfirm. 감사 D06-03 이 남긴 네이티브 confirm 4곳 중 하나였고,
  //   첨부 삭제가 같은 화면에 useConfirm 을 들이면서 이름이 겹쳐 함께 이행했다(문구·키보드·보조기술 동작 통일).
  //   [2026-09-27 DIP B5 F9] 수정 화면도 묻는다. 종전에는 새 글에서만 물어, 글을 고치다 다른 화면에 다녀오면 고친 내용을
  //   되살릴 길이 없었다. 수정 화면은 저장된 글로 채워져 있으므로 초안이 그 글과 다를 때만 묻는다.
  useEffect(() => {
    if (!draftScope || draftPromptedRef.current) return;
    draftPromptedRef.current = true;
    const checkDraft = async () => {
      if (!hasDraft) return;
      const editing = Boolean(activeRecordId);
      if (editing) {
        const draft = peekDraft();
        if (!draft || (draft.title === (initialData?.pstTtl ?? '') && draft.content === (initialData?.pstCn ?? ''))) return;
      } else if (form.getValues('pstTtl') || form.getValues('pstCn')) {
        return;
      }
      const restore = await confirm(editing ? {
        title: '수정하던 초안 복구',
        message: '이 글을 수정하던 초안이 현재 탭에 있습니다. 초안으로 바꾸시겠습니까? 바꾸지 않으면 저장된 글을 그대로 수정합니다.',
        confirmText: '초안으로 바꾸기',
        cancelText: '저장된 글로 수정',
      } : {
        title: '임시저장 데이터 복구',
        message: '현재 탭에서 작성하던 초안이 있습니다. 복구하시겠습니까?',
        confirmText: '복구',
        cancelText: '새로 작성',
      });
      if (restore && restoreDraft()) toast('임시저장 데이터를 복구했습니다.', 'success');
    };
    // 최초 판단과 비동기 확인이 끝날 때까지 서버 초기값이 초안·File을 덮지 않게 한다.
    void checkDraft().finally(() => setDraftRestorePending(false));
  }, [confirm, hasDraft, restoreDraft, peekDraft, toast, activeRecordId, initialData, form, draftScope]);

  const onSubmit = async (values: BoardFormValues) => {
    if (!canWrite || submittingRef.current) return;
    const references = getBoardMediaReferences(values.pstCn);
    const pending = pendingMediaFiles.filter((file) => references.some((reference) => reference.name === file.name));
    if (references.some((reference) => {
      const matches = pending.filter((file) => file.name === reference.name).length
        + attachments.filter((file) => file.orignlFileNm === reference.name).length;
      return matches !== 1;
    })) {
      form.setError('pstCn', { message: '본문의 이미지·영상 파일을 확인할 수 없습니다. 해당 항목을 본문에서 제거한 뒤 파일을 다시 첨부해 주세요.' });
      form.focusError('pstCn');
      return;
    }
    const submittedFiles = uploadLimits.allowed ? [...newFiles, ...pending] : [];
    if ((!uploadLimits.allowed && pending.length > 0) || submittedFiles.length > uploadLimits.remaining
      || submittedFiles.some((file) => file.size === 0 || file.size > uploadLimits.maxSizeMB * 1024 * 1024)
      || submittedFiles.reduce((sum, file) => sum + file.size, 0) > SAVE_TOTAL_MAX_MB * 1024 * 1024) {
      toast('첨부 가능한 파일 수와 크기를 확인해 주세요. 본문 미디어도 첨부 제한에 포함됩니다.', 'error');
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      // 새로 붙인 파일 — 서버 액션이 `files` 키를 읽어 multipart 로 넘긴다(boardActions.saveBoardArticle).
      // [2026-09-27 DIP B5 F9] 게시판이 첨부를 받지 않아 업로더를 감춘 뒤에는 앞서 고른 파일도 보내지 않는다.
      submittedFiles.forEach((file) => formData.append('files', file));

      // Props 또는 initialData의 pstSn가 존재하는 경우 확실하게 폼 데이터에 추가하여 수정(PUT) 분기 작동 보장
      const activePstSn = activeRecordId;
      if (activePstSn) {
        formData.append('pstSn', activePstSn.toString());
      }

      const result = await saveBoardArticle(null, formData);
      // Debug log removed for Zero-Tolerance clean console requirement
      
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] });
        const refreshes: Promise<unknown>[] = [];
        if (activePstSn) {
          // An inactive query seeded only with SSR initialData is not refetched by
          // invalidateQueries. Fetch explicitly before navigating to avoid stale media.
          const detailKey = ['article-detail', bbsId, activePstSn];
          if (queryClient.getQueryState(detailKey)) {
            refreshes.push(queryClient.fetchQuery({
              queryKey: detailKey,
              queryFn: () => knowledgeService.getArticle(bbsId, activePstSn, { countView: false }),
              staleTime: 0,
            }).catch(() => {
              // The write already succeeded. Remove stale data if this refresh fails.
              queryClient.removeQueries({ queryKey: detailKey, exact: true });
            }));
          }
          refreshes.push(queryClient.invalidateQueries({ queryKey: ['boardArticle', bbsId, activePstSn], refetchType: 'all' }));
        }
        if (existingAtchFileSn) {
          refreshes.push(queryClient.invalidateQueries({ queryKey: ['article-files', existingAtchFileSn], refetchType: 'all' }));
        }
        await Promise.all(refreshes);
        clearDraft();
        // 저장을 마쳤으니 미저장 보호를 푼다 — 아래 이동을 '저장하지 않은 변경' 으로 묻거나 '저장 중' 으로 막지 않는다(UX-07).
        savedRef.current = true;
        toast(pstSn ? '게시글을 수정했습니다.' : '게시글을 등록했습니다.', 'success');
        // [2026-09-26 DIP C8] 작성 화면을 방문 기록에서 바꿔 끼운다. push 로 가면 뒤로 가기가 저장을 마친 폼으로
        //   돌아가고, 한 번 더 눌러야 목록(URL 에 실린 페이지·검색 조건)에 닿았다.
        router.replace(result.redirect || `/admin/community/boards/select-board-list?bbsId=${bbsId}`);
      } else {
        // [2026-09-26 DIP V9] 액션이 돌려준 사유(권한·파일 크기·형식·서버 안내)를 버리지 않는다.
        if (!form.applyServerErrors(result)) {
          toast(result.message
            ? `${result.message} 입력 내용은 유지됩니다.`
            : '게시글을 저장하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.', 'error');
        }
      }
    } catch (error) {
      if (!form.applyServerErrors(error)) {
        toast('게시글을 저장하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.', 'error');
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  /*
    [2026-10-26 ADR-0043 1차 UX-09] 머리에 어느 게시판에 쓰는지와 누가 보는지를 말한다. 종전 머리 표지는 늘 '커뮤니티 게시판' 이라, 공지
    편집 권한자가 옛 주소로 들어와 공지사항에 쓰면서도 커뮤니티 게시판이라고 읽었다. 이름은 이용자 메타의 게시판 이름이고, 모르면
    지어내지 않는다.
  */
  const boardName = boardMeta?.bbsTtl?.trim() || null;
  const audience = articleAudience(boardMeta, privatePostPolicy === 'REQUIRED' || secretSelected);
  const isCalendarBoard = boardMeta?.tmpltId === CALENDAR_TEMPLATE_ID;

  return (
    <div className="mx-auto max-w-[var(--page-max-w)] space-y-4 pb-6">
      {/* Header section */}
      <div className="flex items-start gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="size-8 shrink-0"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Button>
        <div className="min-w-0 space-y-1">
          {boardName && (
            <span className="inline-block max-w-full truncate rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {boardName}
            </span>
          )}
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {pstSn ? '게시글 수정' : '새 게시글 작성'}
          </h1>
          {audience && (
            <p className="text-[length:var(--font-size-body)] text-muted-foreground" data-testid="article-audience">
              이 글은 {audience} 봅니다.
              {/*
                [2026-10-26 ADR-0043 1차 UX-06] 같은 Q&A 게시판에 입구가 둘이다 — 공개 질문(여기·지식 허브 질의응답)과 나만 볼 1:1 문의
                (도움말 센터). 공개 쪽 작성 화면이 공개 범위와 1:1 경로를 알리지 않아, 혼자 볼 문의를 모두가 보는 글로 남길 수 있었다.
                도움말은 도움말 기능의 화면이라 그 기능을 고르지 않은 구성에서는 안내가 함께 빠진다.
              */}
              {/* reusable-base:help:start */}
              {/* Q&A 화면 유형(TMPLT_QNA, board-types.ts 정본)의 공개 글에만 둔다 — 상수를 블록 밖에 두면 도움말이 빠진 구성에서 쓰이지 않는 이름이 남는다. */}
              {boardMeta?.tmpltId === 'TMPLT_QNA' && privatePostPolicy !== 'REQUIRED' && !secretSelected && (
                <>
                  {' '}나만 볼 문의는{' '}
                  <Link href="/help" className="font-medium text-primary underline underline-offset-2 hover:text-primary/80">
                    도움말 센터 1:1 문의
                  </Link>
                  를 쓰세요.
                </>
              )}
              {/* reusable-base:help:end */}
            </p>
          )}
        </div>
      </div>

      <Form {...form}>
        {isBoardMetaError ? <div role="alert" className="space-y-2">
          <p>게시판 편집 권한을 확인하지 못했습니다. 입력 내용은 유지됩니다.</p>
          <Button type="button" variant="outline" onClick={() => { void refetchBoardMeta(); }}>권한 다시 확인</Button>
        </div> : !canWrite && <p role="status" className="text-sm text-muted-foreground">
          {boardMeta ? '이 게시판을 편집할 권한이 없습니다. 필요한 권한은 관리자에게 문의해 주세요.' : '게시판 편집 권한을 확인하고 있습니다.'}
        </p>}
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={!canWrite || isSubmitting} className="contents">
          <p className="text-sm text-muted-foreground">
            초안 임시 보관은 현재 탭에서만 유효합니다. 새로고침하거나 탭을 닫으면 사라지므로 게시글을 등록해 주세요.
          </p>
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {lastSavedAt ? '현재 탭에 초안을 임시 보관했습니다.' : ''}
          </p>
          <FormErrorSummary
            labels={{
              pstTtl: '제목',
              pstCn: '본문 내용',
              pstBgngYmd: '게시 시작일',
              pstEndYmd: '게시 종료일',
              evntDt: '행사 일자',
            }}
            onNavigate={form.focusError}
            className="scroll-mt-6"
          />
          {/* Title Input Area */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="pstTtl"
                required
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[length:var(--font-size-body)] font-medium text-foreground">제목</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="article-title-input"
                        className="h-[var(--control-h)] text-[length:var(--font-size-body)] text-foreground placeholder:text-muted-foreground"
                        placeholder="제목을 입력하세요."
                        autoFocus
                        aria-label="게시글 제목"
                        maxLength={256}
                      />
                    </FormControl>
                    <FormMessage className="pt-1 text-xs text-destructive-emphasis" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Content Editor Area */}
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="pstCn"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[length:var(--font-size-body)] font-medium text-foreground">본문 내용</FormLabel>
                  <RichTextFieldControl value={field.value} onChange={field.onChange} readOnly={!canWrite || isSubmitting}
                    media={{ atchFileSn: existingAtchFileSn, attachments, pendingFiles: pendingMediaFiles,
                      onAddFiles: addMediaFiles, disabled: !canWrite || isSubmitting || !uploadLimits.allowed }} />
                  {/* 편집기의 설명(aria-describedby)이다 — 상한의 단위와 지금 길이를 함께 말한다(UX-08). */}
                  <FormDescription
                    className={contentTooLong ? 'text-xs font-medium text-destructive-emphasis' : 'text-xs'}
                    data-testid="article-content-length"
                  >
                    본문은 서식 포함 {CONTENT_MAX_TEXT}자까지 저장할 수 있습니다(현재 {contentLength.toLocaleString('ko-KR')}자).
                  </FormDescription>
                  <FormMessage className="pt-1 text-xs text-destructive-emphasis" />
                </FormItem>
              )}
            />
          </div>

          {/* 비밀글 정책(ADR-0040 결정 7) — 위 privatePostPolicy 주석 참고 */}
          {privatePostPolicy === 'OPTIONAL' && (
            <FormField
              control={form.control}
              name="scrtYn"
              render={({ field }) => (
                <FormItem className="flex items-start gap-2 space-y-0 rounded-md border border-border bg-card p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value === 'Y'}
                      onCheckedChange={(checked) => field.onChange(checked === true ? 'Y' : 'N')}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="text-[length:var(--font-size-body)] font-medium text-foreground">비밀글로 쓰기</FormLabel>
                    <FormDescription className="text-xs">작성자와 게시판 관리자만 봅니다.</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          )}
          {privatePostPolicy === 'REQUIRED' && (
            <p role="note" className="rounded-md border border-border bg-card p-3 text-[length:var(--font-size-body)] text-muted-foreground">
              이 게시판의 글은 비밀글로 저장됩니다. 작성자와 게시판 관리자만 봅니다.
              {editingPublicPost ? ' 지금 공개된 글이라 저장하면 비밀글로 바뀝니다.' : ''}
            </p>
          )}

          {/* 첨부파일 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Paperclip size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-[length:var(--font-size-body)] font-semibold text-foreground">첨부파일</h2>
            </div>

            {existingAtchFileSn && (
              isAttachmentError ? (
                <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
                  <span className="text-[length:var(--font-size-body)]">기존 첨부파일 목록을 불러오지 못했습니다.</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => void refetchAttachments()}>
                    다시 시도
                  </Button>
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-[length:var(--font-size-body)] text-muted-foreground">등록된 첨부파일이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border" aria-label="기존 첨부파일">
                  {attachments.map((file) => {
                    const key = attachmentKey(file);
                    return (
                      <li key={key} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="truncate text-[length:var(--font-size-body)]">{file.orignlFileNm}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={deletingFileKey !== null}
                          aria-busy={deletingFileKey === key}
                          onClick={() => void handleDeleteAttachment(file)}
                          aria-label={`${file.orignlFileNm} 삭제`}
                          className="gap-2 shrink-0"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          {deletingFileKey === key ? '삭제 중…' : '삭제'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            {!uploadLimits.allowed ? (
              <p role="note" className="text-[length:var(--font-size-body)] text-muted-foreground">
                이 게시판은 파일 첨부를 받지 않습니다.
              </p>
            ) : uploadLimits.remaining === 0 ? (
              <p role="note" className="text-[length:var(--font-size-body)] text-muted-foreground">
                이 게시판의 첨부 파일 수({uploadLimits.boardMaxFiles}개)를 모두 채웠습니다. 새 파일을 붙이려면 기존 첨부를 먼저 삭제하세요.
              </p>
            ) : (
              <div className="space-y-2">
                <StandardFileUploader
                  name="files"
                  onFilesChange={setNewFiles}
                  maxFiles={Math.max(0, uploadLimits.remaining - selectedMediaFiles.length)}
                  maxSizeMB={uploadLimits.maxSizeMB}
                  accept={BOARD_UPLOAD_ACCEPT}
                />
                <p className="text-xs text-muted-foreground">
                  새로 붙인 파일은 게시글을 저장할 때 함께 올라갑니다.{existingAtchFileSn ? ' 기존 첨부에 추가됩니다.' : ''}
                  {uploadLimits.boardMaxFiles !== null ? ` 이 게시판은 파일을 ${uploadLimits.boardMaxFiles}개까지(기존 첨부 포함) 받습니다.` : ''}
                  {` 파일 하나당 ${formatMegabytes(uploadLimits.maxSizeMB)}까지, 형식은 ${BOARD_UPLOAD_EXTENSIONS.join(', ')} 입니다. 본문 이미지·영상도 첨부 수에 포함됩니다.`}
                  {/* [2026-10-26 ADR-0043 1차 UX-08] 저장 한 번의 전체 크기 상한도 미리 말한다 — 종전에는 넘은 뒤에야 알렸다. */}
                  {` 한 번 저장할 때 새로 올리는 파일은 본문 이미지·영상을 합쳐 모두 ${SAVE_TOTAL_MAX_MB}MB까지입니다.`}
                </p>
              </div>
            )}
          </div>

          {/* 게시 기간 */}
          {/*
            [2026-10-01 결정 23 → 2026-10-23 ADR-0040 결정 3] 게시 시작일과 종료일을 모두 집행한다 — 시작일이 오늘(Asia/Seoul)보다
            뒤인 글은 그날까지, 종료일이 지난 글은 그 뒤로 일반 사용자의 목록·상세·검색에서 보이지 않고, 작성자와 게시판 관리자(조회
            대행 권한)에게는 '예약'·'게시 종료' 로 보인다(BoardPredicate·BoardService). 종전에는 시작일을 기록만 했고 이 문구가 그
            사실을 말했다. 미래 시작일은 게시판이 예약 게시를 받을 때만 된다(설정 rsvtPstgPsbltyYn). honest-affordance-contract 가
            문구와 술어·예약 설정을 함께 고정한다.
            [2026-10-26 ADR-0043 1차 UX-09] 대부분의 글은 기간을 정하지 않으므로 '게시 기간 설정' 으로 접는다. 접힌 머리에 지금 값을
            요약하고, 기간을 정한 글을 고칠 때·기간 칸에 오류가 있을 때는 펼친다(오류 요약에서 가는 길은 revealField 가 연다).
          */}
          <details
            className="rounded-md border border-border bg-card"
            open={periodOpen || periodHasError}
            onToggle={(event) => setPeriodOpen(event.currentTarget.open)}
            data-testid="posting-period"
          >
            {/* summary 는 목록 표시(펼침 표지)를 지키도록 flex 로 바꾸지 않는다 — 표지가 사라지면 접힌 칸인 줄 알 수 없다. */}
            <summary className="cursor-pointer px-3 py-2 text-[length:var(--font-size-body)] font-semibold text-foreground">
              <Calendar size={16} className="mr-1 inline-block align-text-bottom text-muted-foreground" aria-hidden="true" />
              게시 기간 설정
              <span className="ml-1 font-normal text-muted-foreground">({postingPeriodSummary(postingStart, postingEnd)})</span>
            </summary>
            <div className="space-y-2 border-t border-border p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                시작일이 오늘보다 뒤면 그날까지 작성자와 게시판 관리자에게만 보입니다. 종료일이 지나면 일반 사용자의 목록·상세·검색에서
                보이지 않습니다. 작성자와 게시판 관리자에게는 &lsquo;게시 종료&rsquo;로 표시됩니다.
                {pstSn ? ' 비워 두면 기존 값은 그대로 둡니다.' : ''}
              </p>
              {reservationClosed && (
                <p role="note" className="text-xs leading-relaxed text-muted-foreground">
                  이 게시판은 예약 게시를 받지 않아 시작일을 오늘보다 뒤로 정할 수 없습니다.
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {PERIOD_FIELDS.map((dateField) => (
                  <FormField
                    key={dateField.name}
                    control={form.control}
                    name={dateField.name}
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[length:var(--font-size-body)] font-medium text-foreground">{dateField.label}</FormLabel>
                        <FormControl>
                          {/* 화면은 날짜 입력(yyyy-MM-dd)이고 폼 값은 저장 포맷(yyyyMMdd)이다(D12). */}
                          <Input
                            type="date"
                            {...field}
                            value={toDateInputValue(field.value)}
                            onChange={(event) => field.onChange(fromDateInputValue(event.target.value))}
                            readOnly={dateField.name === 'pstBgngYmd' && startDateLocked}
                            className="h-[var(--control-h)] rounded-md border-border read-only:bg-muted"
                          />
                        </FormControl>
                        {dateField.name === 'pstBgngYmd' && startDateLocked && (
                          <FormDescription className="text-xs">
                            게시가 시작된 글의 시작일은 게시글 전체 수정 권한이 있어야 바꿀 수 있습니다.
                          </FormDescription>
                        )}
                        <FormMessage className="text-xs text-destructive-emphasis" />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
          </details>

          {/* [2026-10-26 ADR-0043 1차 UX-09] 행사 일자는 캘린더 게시판에서만 묻는다 — 위 PERIOD_FIELDS 주석. */}
          {isCalendarBoard && (
            <FormField
              control={form.control}
              name="evntDt"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[length:var(--font-size-body)] font-medium text-foreground">행사 일자</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} className="h-[var(--control-h)] max-w-xs rounded-md border-border" />
                  </FormControl>
                  <FormDescription className="text-xs">
                    달력에 이 날짜로 표시합니다.{pstSn ? ' 비워 두면 기존 값은 그대로 둡니다.' : ' 비워 두면 등록일로 표시합니다.'}
                  </FormDescription>
                  <FormMessage className="text-xs text-destructive-emphasis" />
                </FormItem>
              )}
            />
          )}

          {/* Bottom Actions Matrix */}
          <div className="flex flex-col items-center justify-end gap-3 border-t border-border pt-4 sm:flex-row">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none"
                aria-label="취소"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 gap-2 sm:flex-none"
                aria-label={pstSn ? '게시글 수정' : '게시글 등록'}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>게시글 저장 중…</span>
                  </>
                ) : (
                  <>
                    <Save size={16} aria-hidden="true" />
                    {pstSn ? '게시글 수정' : '게시글 등록'}
                  </>
                )}
              </Button>
            </div>
          </div>
          </fieldset>
        </form>
      </Form>

    </div>
  );
}
