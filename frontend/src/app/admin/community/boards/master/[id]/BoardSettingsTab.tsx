'use client';

import { useRef, useState } from 'react';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { History, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormErrorSummary } from '@/components/ui/form';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { canPermission } from '@/lib/auth/permissions';
import { isConflictError } from '@/lib/query/list-query-defaults';
import { boardTypeLabel } from '@/lib/board/board-types';
import { SERVER_MAX_FILE_SIZE_MB, SERVER_MAX_FILES_PER_REQUEST } from '@/lib/attachments/server-upload-limits';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { invalidateBoardCaches } from '@/queries/board-master-query-options';
import {
  boardAdminService,
  type BoardMasterDetail,
  type BoardMasterUpdateRequest,
} from '@/services/foundation/system/BoardAdminService';
import { BoardMasterUpdateRequestSchema } from '@/types/generated-zod';
import { BoardChangeHistoryDialog } from './BoardChangeHistoryDialog';
import { boardUsageNotes, privatePostPolicyWarnings } from '../board-usage';
import { generatedRange, pinCountSchema } from '../board-pin-count';

/**
 * 게시판 운영 화면의 설정 탭(ADR-0040 §5.5·결정 9·10).
 *
 * A3-1 판정: 같은 화면 탭 패널 안에서 펼쳐지는 **인라인** 그릇이다(라우트 이동 0 — 카탈로그 우선순위의 첫째). 저장 전 확인은 화면
 * 안 대화상자로 한다. 확인 대화상자가 있어 폼 그릇 census 후보에서 빠지는 것은 이 판정의 근거가 아니다.
 *
 * 저장은 "변경 n건 · 변경 취소 · 변경 내용 확인" 순이다. 확인 표에 항목·현재·변경 후·영향을 보이고, 서버가 버전 충돌(409)로
 * 거부하면 최신 값을 다시 읽어 같은 표로 비교하게 한다. 화면 유형·커뮤니티 귀속은 만든 뒤 바꾸지 않으므로 읽기 전용이다.
 */
const BYTES_PER_MB = 1024 * 1024;

type FieldKey = 'bbsTtl' | 'bbsExpln' | 'useYn' | 'ansYn' | 'stsfdgYn' | 'fileAtchPsbltyYn' | 'atchPsbltyFileQty' | 'atchPsbltyFileSz'
  | 'rsvtPstgPsbltyYn' | 'upendFixPsbltyYn' | 'upendFixUplmtNocs' | 'upendFixBscDayCnt' | 'prvtPstPlcyCd' | 'rcmdtnUseYn';
type Draft = Partial<Record<FieldKey, string | number>>;
type PrivatePostPolicy = NonNullable<BoardMasterUpdateRequest['prvtPstPlcyCd']>;

const yesNo = (yes: string, no: string) => (value: unknown) => (value === 'N' ? no : yes);
/** 비밀글 정책 세 값(ADR-0040 결정 7)의 화면 이름. 어휘는 생성 스키마의 enum 이다. */
const PRIVATE_POST_POLICY_LABELS: Readonly<Record<PrivatePostPolicy, string>> = {
  NONE: '없음',
  OPTIONAL: '선택',
  REQUIRED: '필수',
};
/** 선택 칸의 항목 — 값마다 무엇이 달라지는지 함께 말한다. */
const PRIVATE_POST_POLICY_OPTIONS: Readonly<Record<PrivatePostPolicy, string>> = {
  NONE: '없음(작성 화면에 선택 없음)',
  OPTIONAL: '선택(글쓴이가 고름)',
  REQUIRED: '필수(늘 비밀글로 저장)',
};
const PRIVATE_POST_POLICIES = BoardMasterUpdateRequestSchema.shape.prvtPstPlcyCd.unwrap().options;
const toPrivatePostPolicy = (value: unknown): PrivatePostPolicy =>
  (PRIVATE_POST_POLICIES as readonly unknown[]).includes(value) ? value as PrivatePostPolicy : 'NONE';
const FIELDS: readonly { key: FieldKey; label: string; format: (value: unknown) => string; impact?: (value: unknown) => string | null }[] = [
  { key: 'bbsTtl', label: '게시판 명칭', format: (value) => String(value ?? '') },
  { key: 'bbsExpln', label: '게시판 소개', format: (value) => (value ? String(value) : '없음') },
  {
    key: 'useYn', label: '게시판 사용', format: yesNo('사용', '사용 안 함'),
    impact: (value) => (value === 'N'
      ? '이용자에게 읽기·쓰기 모두 닫힙니다. 운영자는 글을 정리할 수 있습니다.'
      : '이용자에게 열립니다. 메뉴가 일반 그룹에 보이는지 메뉴·접근 탭에서 확인하세요.'),
  },
  { key: 'ansYn', label: '댓글 받기', format: yesNo('받음', '받지 않음'), impact: (value) => (value === 'N' ? '새 댓글만 막습니다. 이미 달린 댓글은 그대로 보입니다.' : null) },
  { key: 'stsfdgYn', label: '만족도 평가 받기', format: yesNo('받음', '받지 않음'), impact: (value) => (value === 'N' ? '새 평가만 막습니다. 이미 남긴 평가는 그대로 보입니다.' : null) },
  { key: 'fileAtchPsbltyYn', label: '파일 첨부 허용', format: yesNo('허용', '허용 안 함'), impact: (value) => (value === 'N' ? '새 첨부만 막습니다. 이미 붙은 파일은 그대로입니다.' : null) },
  { key: 'atchPsbltyFileQty', label: '첨부 파일 수', format: (value) => (Number(value) === 0 ? '상한 없음' : `${Number(value)}개`) },
  { key: 'atchPsbltyFileSz', label: '파일당 크기', format: (value) => (Number(value) > 0 ? `${(Number(value) / BYTES_PER_MB).toLocaleString()}MB` : '전역 상한') },
  // [2026-10-23 ADR-0040 결정 3·6] 예약 게시는 새 미래 시작일을 받을지만 정한다 — 이미 있는 글의 가시성은 바뀌지 않는다.
  //   이름은 서버 변경 이력의 항목명('예약 게시')과 같다.
  {
    key: 'rsvtPstgPsbltyYn', label: '예약 게시', format: yesNo('받음', '받지 않음'),
    impact: (value) => (value === 'N'
      ? '새 미래 시작일만 막습니다. 이미 예약된 글은 시작일에 공개됩니다.'
      : '새 글에 오늘보다 뒤의 시작일을 받습니다. 그 글은 시작일까지 작성자와 게시판 관리자에게만 보입니다.'),
  },
  // [2026-10-23 ADR-0040 결정 5·6] 상단 고정 설정은 새 고정만 정한다 — 끄거나 상한을 낮춰도 이미 고정된 글은 종료일까지 그대로다.
  //   이름은 서버 변경 이력의 항목명('상단 고정 허용'·'상단 고정 상한'·'상단 고정 기본 일수')과 같다.
  {
    key: 'upendFixPsbltyYn', label: '상단 고정 허용', format: yesNo('허용', '허용 안 함'),
    impact: (value) => (value === 'N'
      ? '새 고정만 막습니다. 고정 중인 글은 고정 종료일까지 위에 남고 해제할 수 있습니다.'
      : '운영 화면 게시물 탭에서 글을 상단에 고정할 수 있습니다(게시글 상단 고정 권한 필요).'),
  },
  {
    key: 'upendFixUplmtNocs', label: '상단 고정 상한', format: (value) => `${Number(value).toLocaleString()}건`,
    impact: () => '새 고정이 이 상한을 따릅니다. 줄여도 이미 고정된 글은 풀리지 않습니다.',
  },
  {
    key: 'upendFixBscDayCnt', label: '상단 고정 기본 일수', format: (value) => `${Number(value).toLocaleString()}일`,
    impact: () => '고정 종료일을 비우고 고정할 때의 기간입니다. 이미 고정된 글의 종료일은 바뀌지 않습니다.',
  },
  // [2026-10-23 ADR-0040 결정 6·7] 비밀글 정책은 앞으로 저장하는 글에만, 추천 받기는 새 추천에만 적용된다 — 이미 있는 비밀글은 계속
  //   보호되고 쌓인 추천 수는 그대로다. 이름은 서버 변경 이력의 항목명('비밀글 정책'·'추천 받기')과 같다.
  {
    key: 'prvtPstPlcyCd', label: '비밀글 정책', format: (value) => PRIVATE_POST_POLICY_LABELS[toPrivatePostPolicy(value)],
    impact: (value) => {
      const policy = toPrivatePostPolicy(value);
      if (policy === 'REQUIRED') return '앞으로 저장하는 글(새 글과 고친 글)은 늘 비밀글이 됩니다. 이미 있는 글은 고칠 때까지 그대로입니다.';
      if (policy === 'OPTIONAL') return '작성 화면에 비밀글 선택이 생깁니다. 이미 있는 비밀글은 계속 보호됩니다.';
      return '작성 화면에 비밀글 선택이 없습니다. 이미 있는 비밀글은 계속 보호됩니다.';
    },
  },
  {
    key: 'rcmdtnUseYn', label: '추천 받기', format: yesNo('받음', '받지 않음'),
    impact: (value) => (value === 'N' ? '새 추천만 막습니다. 쌓인 추천 수는 그대로이고, 각자 자기 추천은 거둘 수 있습니다.' : null),
  },
];

// [2026-10-23 ADR-0040 결정 5] 상단 고정 상한·기본 일수의 범위는 생성 스키마(서버 @Min·@Max)에서 온다 — 화면 상수를 두지 않는다.
const PIN_LIMIT_GENERATED = BoardMasterUpdateRequestSchema.shape.upendFixUplmtNocs.unwrap();
const PIN_DAYS_GENERATED = BoardMasterUpdateRequestSchema.shape.upendFixBscDayCnt.unwrap();
const PIN_LIMIT_RANGE = generatedRange(PIN_LIMIT_GENERATED);
const PIN_DAYS_RANGE = generatedRange(PIN_DAYS_GENERATED);

const settingsSchema = BoardMasterUpdateRequestSchema.pick({ bbsTtl: true, bbsExpln: true }).extend({
  bbsTtl: BoardMasterUpdateRequestSchema.shape.bbsTtl.trim().min(1, '게시판 명칭을 입력해 주세요.'),
  bbsExpln: BoardMasterUpdateRequestSchema.shape.bbsExpln.unwrap().trim().optional(),
  atchPsbltyFileQty: z.number({ message: '첨부 파일 수를 숫자로 입력해 주세요.' })
    .int('첨부 파일 수는 정수여야 합니다.')
    .min(0, '첨부 파일 수는 0 이상이어야 합니다.')
    .max(SERVER_MAX_FILES_PER_REQUEST, `서버는 한 번에 ${SERVER_MAX_FILES_PER_REQUEST}개까지 받습니다.`),
  // 0 은 게시판 상한 없음(서버 전역 상한만 적용)이다 — 서버도 0 이하·비어 있음을 상한 없음으로 본다.
  atchPsbltyFileSzMb: z.number({ message: '파일당 크기를 숫자로 입력해 주세요.' })
    .min(0, '파일당 크기는 0 이상이어야 합니다.')
    .max(SERVER_MAX_FILE_SIZE_MB, `서버는 파일 하나당 ${SERVER_MAX_FILE_SIZE_MB}MB 까지 받습니다.`),
  upendFixUplmtNocs: pinCountSchema({ subject: '상단 고정 상한은', object: '상단 고정 상한을' }, '건', PIN_LIMIT_GENERATED),
  upendFixBscDayCnt: pinCountSchema({ subject: '상단 고정 기본 일수는', object: '상단 고정 기본 일수를' }, '일', PIN_DAYS_GENERATED),
});

const settingsLabels = {
  bbsTtl: '게시판 명칭',
  bbsExpln: '게시판 소개',
  atchPsbltyFileQty: '첨부 파일 수',
  atchPsbltyFileSzMb: '파일당 크기(MB)',
  upendFixUplmtNocs: '상단 고정 상한',
  upendFixBscDayCnt: '상단 고정 기본 일수',
};

function baselineOf(detail: BoardMasterDetail): Record<FieldKey, string | number> {
  return {
    bbsTtl: detail.bbsTtl,
    bbsExpln: detail.bbsExpln ?? '',
    useYn: detail.useYn,
    ansYn: detail.ansYn ?? 'Y',
    stsfdgYn: detail.stsfdgYn ?? 'Y',
    fileAtchPsbltyYn: detail.fileAtchPsbltyYn,
    atchPsbltyFileQty: detail.atchPsbltyFileQty,
    // 비어 있는 옛 게시판은 0(전역 상한)과 같은 뜻이다. 다른 값으로 채우면 저장할 때 설정이 조용히 바뀐다.
    atchPsbltyFileSz: detail.atchPsbltyFileSz ?? 0,
    // NOT NULL DEFAULT 'N' 컬럼이라 응답에 늘 있다(D6 기존 게시판 기본값은 받지 않음). 보이는 값과 저장 요청이 같은 판정을 쓰게 Y 만 받음이다.
    rsvtPstgPsbltyYn: detail.rsvtPstgPsbltyYn === 'Y' ? 'Y' : 'N',
    // [2026-10-23 ADR-0040 결정 5·6] 세 값도 NOT NULL DEFAULT('N'·5·30) 컬럼이라 응답에 늘 있다 — 서버 값을 그대로 둔다.
    upendFixPsbltyYn: detail.upendFixPsbltyYn === 'Y' ? 'Y' : 'N',
    upendFixUplmtNocs: detail.upendFixUplmtNocs,
    upendFixBscDayCnt: detail.upendFixBscDayCnt,
    // [2026-10-23 ADR-0040 결정 6·7] 두 값도 NOT NULL DEFAULT('NONE'·'Y') 컬럼이라 응답에 늘 있다. 보이는 값과 저장 요청이 같은 판정을 쓴다.
    prvtPstPlcyCd: toPrivatePostPolicy(detail.prvtPstPlcyCd),
    rcmdtnUseYn: detail.rcmdtnUseYn === 'N' ? 'N' : 'Y',
  };
}

export function BoardSettingsTab({ detail, onReload }: {
  detail: BoardMasterDetail;
  /** 저장·충돌 뒤 최신 상세를 다시 읽는다. */
  onReload: () => Promise<unknown>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { user } = useAuth();
  const canUpdate = canPermission(user, 'BBS_MST_UPDATE');
  const canDelete = canPermission(user, 'BBS_MST_DELETE');
  const validation = useManualFormValidation(settingsSchema, { labels: settingsLabels });
  const [draft, setDraft] = useState<Draft>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pendingRef = useRef(false);

  const baseline = baselineOf(detail);
  const value = (key: FieldKey) => (key in draft ? draft[key] : baseline[key]);
  const changes = FIELDS.filter(({ key }) => key in draft && draft[key] !== baseline[key]);
  useUnsavedChanges({ dirty: changes.length > 0, pending: saving });
  const usage = boardUsageNotes(detail.bbsId, detail.designations);
  // 비밀글 정책의 경고는 화면에 보이는 값(바꾸는 중이면 그 값)으로 계산한다 — FAQ 지정 + 필수, 질의응답 게시판 + 없음 아님(결정 7).
  const policyWarnings = privatePostPolicyWarnings(detail.bbsId, detail.designations, String(value('prvtPstPlcyCd')));

  const edit = (key: FieldKey, next: string | number) => {
    setDraft((current) => ({ ...current, [key]: next }));
  };

  const openReview = () => {
    if (!canUpdate || changes.length === 0) return;
    const validated = validation.validate({
      bbsTtl: String(value('bbsTtl') ?? ''),
      bbsExpln: String(value('bbsExpln') ?? ''),
      atchPsbltyFileQty: Number(value('atchPsbltyFileQty')),
      atchPsbltyFileSzMb: Number(value('atchPsbltyFileSz')) / BYTES_PER_MB,
      upendFixUplmtNocs: Number(value('upendFixUplmtNocs')),
      upendFixBscDayCnt: Number(value('upendFixBscDayCnt')),
    });
    if (validated) setReviewOpen(true);
  };

  const save = async () => {
    if (!canUpdate || pendingRef.current) return;
    // 확인 표를 연 뒤에도 쓰기 직전에 같은 규칙으로 다시 본다 — 저장 경로가 검증을 건너뛰지 않게 한다.
    const validated = validation.validate({
      bbsTtl: String(value('bbsTtl') ?? ''),
      bbsExpln: String(value('bbsExpln') ?? ''),
      atchPsbltyFileQty: Number(value('atchPsbltyFileQty')),
      atchPsbltyFileSzMb: Number(value('atchPsbltyFileSz')) / BYTES_PER_MB,
      upendFixUplmtNocs: Number(value('upendFixUplmtNocs')),
      upendFixBscDayCnt: Number(value('upendFixBscDayCnt')),
    });
    if (!validated) {
      setReviewOpen(false);
      return;
    }
    const request: BoardMasterUpdateRequest = {
      bbsTtl: validated.bbsTtl,
      bbsExpln: validated.bbsExpln ?? '',
      ansPsbltyYn: detail.ansPsbltyYn === 'Y' ? 'Y' : 'N',
      fileAtchPsbltyYn: value('fileAtchPsbltyYn') === 'N' ? 'N' : 'Y',
      atchPsbltyFileQty: validated.atchPsbltyFileQty,
      atchPsbltyFileSz: Math.round(validated.atchPsbltyFileSzMb * BYTES_PER_MB),
      useYn: value('useYn') === 'N' ? 'N' : 'Y',
      ansYn: value('ansYn') === 'N' ? 'N' : 'Y',
      stsfdgYn: value('stsfdgYn') === 'N' ? 'N' : 'Y',
      rsvtPstgPsbltyYn: value('rsvtPstgPsbltyYn') === 'Y' ? 'Y' : 'N',
      upendFixPsbltyYn: value('upendFixPsbltyYn') === 'Y' ? 'Y' : 'N',
      upendFixUplmtNocs: validated.upendFixUplmtNocs,
      upendFixBscDayCnt: validated.upendFixBscDayCnt,
      prvtPstPlcyCd: toPrivatePostPolicy(value('prvtPstPlcyCd')),
      rcmdtnUseYn: value('rcmdtnUseYn') === 'N' ? 'N' : 'Y',
      version: detail.version,
    };
    pendingRef.current = true;
    setSaving(true);
    try {
      await boardAdminService.updateBoardMaster(detail.bbsId, BoardMasterUpdateRequestSchema.parse(request));
      toast('게시판 설정을 저장했습니다.', 'success');
      setDraft({});
      setConflict(false);
      setReviewOpen(false);
      // 이름·사용 여부는 목록·이용 화면 메타·선택지·커뮤니티 게시판 목록에도 보인다 — 모두 다시 읽는다(변경 이력 포함).
      await Promise.all([onReload(), invalidateBoardCaches(queryClient)]);
    } catch (error) {
      if (isConflictError(error)) {
        // 덮어쓰지 않았다 — 최신 값을 다시 읽고, 입력은 남겨 같은 확인 표로 다시 비교하게 한다(결정 10).
        setConflict(true);
        setReviewOpen(false);
        toast(extractErrorMessage(error, '다른 사용자가 먼저 수정했습니다. 저장하지 않았습니다.'), 'error');
        await onReload();
      } else {
        const fieldErrors = extractFieldErrors(error);
        if (fieldErrors) {
          setReviewOpen(false);
          validation.setFormErrors(fieldErrors);
        } else toast(extractErrorMessage(error, '게시판 설정을 저장하지 못했습니다.'), 'error');
      }
    } finally {
      pendingRef.current = false;
      setSaving(false);
    }
  };

  const purge = async () => {
    if (!canDelete || pendingRef.current) return;
    pendingRef.current = true;
    setDeleting(true);
    try {
      const deletable = await boardAdminService.isBoardMasterDeletable(detail.bbsId);
      if (!deletable) {
        await confirm({
          title: '영구 삭제할 수 없습니다',
          message: `[${detail.bbsTtl}] 게시판은 글이 한 번이라도 있었던 게시판이라 영구 삭제할 수 없습니다. 지운 글도 기록이 남아 있습니다. 쓰지 않을 게시판은 사용 안 함 상태로 두십시오.`,
          confirmText: '확인',
          variant: 'default',
        });
        return;
      }
      const confirmed = await confirm({
        title: '게시판 영구 삭제',
        message: `[${detail.bbsTtl}] 게시판과 그 설정을 영구 삭제합니다. 되돌릴 수 없습니다. 이 게시판을 가리키는 메뉴는 따로 정리해야 합니다.`,
        confirmText: '영구 삭제',
        variant: 'destructive',
      });
      if (!confirmed) return;
      await boardAdminService.deleteBoardMasterPhysically(detail.bbsId);
      toast('게시판을 영구 삭제했습니다.', 'success');
      // 지운 게시판의 상세는 캐시에서 먼저 뺀다 — 아직 열린 이 화면이 그 게시판을 다시 읽어 404 오류를 띄우지 않게 한다.
      void invalidateBoardCaches(queryClient, { removedBbsId: detail.bbsId });
      router.push('/admin/community/boards/master');
    } catch (error) {
      toast(extractErrorMessage(error, '영구 삭제하지 못했습니다.'), 'error');
    } finally {
      pendingRef.current = false;
      setDeleting(false);
    }
  };

  const switchRow = (key: 'useYn' | 'ansYn' | 'stsfdgYn' | 'fileAtchPsbltyYn' | 'rsvtPstgPsbltyYn' | 'upendFixPsbltyYn' | 'rcmdtnUseYn', label: string, hint?: string) => (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <label htmlFor={`board-settings-${key}`} className="cursor-pointer text-[length:var(--font-size-body)] text-foreground">{label}</label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch
        id={`board-settings-${key}`}
        checked={value(key) !== 'N'}
        disabled={!canUpdate || saving}
        onCheckedChange={(checked) => edit(key, checked ? 'Y' : 'N')}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {(usage.length > 0 || detail.tmpltId === 'TMPLT_QNA') && (
        <section aria-labelledby="board-settings-constraints" className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-4">
          <h2 id="board-settings-constraints" className="text-[length:var(--font-size-body)] font-semibold text-foreground">이 게시판의 고정 제약</h2>
          <ul className="list-disc space-y-1 pl-5 text-[length:var(--font-size-body)] text-muted-foreground">
            {usage.map((note) => <li key={note}>{note}</li>)}
            {detail.tmpltId === 'TMPLT_QNA' && <li>질의응답 게시판이라 비밀 문의와 공개 질문이 함께 있습니다.</li>}
          </ul>
        </section>
      )}

      {conflict && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[length:var(--font-size-body)] text-foreground">
          다른 사용자가 먼저 수정해 저장하지 않았습니다. 최신 값을 다시 불러왔습니다. 변경 내용을 다시 확인한 뒤 저장하세요.
        </p>
      )}

      <form
        aria-labelledby="board-settings-basic"
        className="space-y-[var(--form-gap)]"
        noValidate
        onSubmit={(event) => { event.preventDefault(); openReview(); }}
      >
        <FormErrorSummary errors={validation.errors} labels={settingsLabels} onNavigate={validation.focusError} />
        <fieldset className="space-y-[var(--form-gap)] rounded-md border border-border p-4">
          <legend id="board-settings-basic" className="px-1 text-[length:var(--font-size-body)] font-semibold text-foreground">기본</legend>
          <div className="space-y-1.5">
            <Label htmlFor="board-settings-name">게시판 명칭</Label>
            <Input
              id="board-settings-name"
              {...validation.fieldProps('bbsTtl')}
              value={String(value('bbsTtl') ?? '')}
              maxLength={100}
              required
              disabled={!canUpdate || saving}
              onChange={(event) => { validation.clearError('bbsTtl'); edit('bbsTtl', event.target.value); }}
            />
            {validation.errors.bbsTtl ? <p {...validation.messageProps('bbsTtl')} className="text-xs font-bold text-destructive-emphasis" /> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="board-settings-description">게시판 소개</Label>
            <Input
              id="board-settings-description"
              {...validation.fieldProps('bbsExpln')}
              value={String(value('bbsExpln') ?? '')}
              maxLength={4000}
              disabled={!canUpdate || saving}
              onChange={(event) => { validation.clearError('bbsExpln'); edit('bbsExpln', event.target.value); }}
            />
            {validation.errors.bbsExpln ? <p {...validation.messageProps('bbsExpln')} className="text-xs font-bold text-destructive-emphasis" /> : null}
          </div>
          {switchRow('useYn', '게시판 사용', '사용 안 함이면 이용자에게 읽기·쓰기 모두 닫힙니다.')}
          <dl className="grid grid-cols-1 gap-3 text-[length:var(--font-size-body)] sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">화면 유형(만든 뒤 바꿀 수 없음)</dt>
              <dd className="text-foreground">{boardTypeLabel(detail.bbsTypeCd, detail.tmpltId) || '알 수 없음'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">커뮤니티 귀속(만든 뒤 바꿀 수 없음)</dt>
              <dd className="text-foreground">{detail.cmntySn ? `커뮤니티 번호 ${detail.cmntySn} — 승인 회원만 이용` : '없음'}</dd>
            </div>
          </dl>
        </fieldset>

        {/*
          [2026-10-23 ADR-0040 결정 3·5·6, §5.5] 게시·고정 설정. 예약 게시는 새 미래 시작일만, 상단 고정 허용·상한은 새 고정만 막거나
          연다 — 이미 있는 글의 가시성·고정은 설정으로 바뀌지 않는다. 켤 때 기록용 미래 시작일 글이 전환 진단 대상이라는 사실을 확인 표
          아래에서 알린다. 상한·기본 일수는 고정을 받지 않는 동안 읽기 전용이다(값은 그대로 저장된다).
        */}
        <fieldset className="space-y-[var(--form-gap)] rounded-md border border-border p-4">
          <legend className="px-1 text-[length:var(--font-size-body)] font-semibold text-foreground">게시·고정</legend>
          {switchRow('rsvtPstgPsbltyYn', '예약 게시',
            '켜면 새 글에 오늘보다 뒤의 시작일을 받습니다. 그 글은 시작일까지 작성자와 게시판 관리자에게만 보입니다. 기존 게시판 기본값: 받지 않음.')}
          {switchRow('upendFixPsbltyYn', '상단 고정 허용',
            '켜면 운영 화면에서 글을 게시판 목록 맨 위에 고정할 수 있습니다. 끄면 새 고정만 막습니다. 기존 게시판 기본값: 허용 안 함.')}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="board-settings-pin-limit">상단 고정 상한(건)</Label>
              <Input
                id="board-settings-pin-limit"
                type="number"
                min={PIN_LIMIT_RANGE.min ?? undefined}
                max={PIN_LIMIT_RANGE.max ?? undefined}
                {...validation.fieldProps('upendFixUplmtNocs')}
                aria-describedby={[validation.fieldProps('upendFixUplmtNocs')['aria-describedby'], 'board-settings-pin-limit-hint'].filter(Boolean).join(' ')}
                value={Number.isNaN(Number(value('upendFixUplmtNocs'))) ? '' : String(value('upendFixUplmtNocs') ?? '')}
                readOnly={value('upendFixPsbltyYn') !== 'Y'}
                disabled={!canUpdate || saving}
                onChange={(event) => { validation.clearError('upendFixUplmtNocs'); edit('upendFixUplmtNocs', event.target.value === '' ? Number.NaN : Number(event.target.value)); }}
              />
              <p id="board-settings-pin-limit-hint" className="text-xs text-muted-foreground">
                고정 중인 글을 이 수까지 둡니다(게시 기간 밖의 글도 셉니다). 기존 게시판 기본값: 5건.
              </p>
              {validation.errors.upendFixUplmtNocs ? <p {...validation.messageProps('upendFixUplmtNocs')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="board-settings-pin-days">상단 고정 기본 일수(일)</Label>
              <Input
                id="board-settings-pin-days"
                type="number"
                min={PIN_DAYS_RANGE.min ?? undefined}
                max={PIN_DAYS_RANGE.max ?? undefined}
                {...validation.fieldProps('upendFixBscDayCnt')}
                aria-describedby={[validation.fieldProps('upendFixBscDayCnt')['aria-describedby'], 'board-settings-pin-days-hint'].filter(Boolean).join(' ')}
                value={Number.isNaN(Number(value('upendFixBscDayCnt'))) ? '' : String(value('upendFixBscDayCnt') ?? '')}
                readOnly={value('upendFixPsbltyYn') !== 'Y'}
                disabled={!canUpdate || saving}
                onChange={(event) => { validation.clearError('upendFixBscDayCnt'); edit('upendFixBscDayCnt', event.target.value === '' ? Number.NaN : Number(event.target.value)); }}
              />
              <p id="board-settings-pin-days-hint" className="text-xs text-muted-foreground">
                고정 종료일을 비우고 고정하면 오늘부터 이 일수 뒤까지 고정합니다. 기존 게시판 기본값: 30일.
              </p>
              {validation.errors.upendFixBscDayCnt ? <p {...validation.messageProps('upendFixBscDayCnt')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>
          </div>
        </fieldset>

        {/*
          [2026-10-23 ADR-0040 결정 6·7, §5.5] 비밀글 정책과 추천 받기를 '참여·첨부' 와 같은 묶음에 둔다(작성·참여). 비밀글 정책은 앞으로
          저장하는 글에만, 추천 받기는 새 추천에만 적용된다. FAQ 지정·질의응답 게시판과 맞지 않는 정책은 칸 아래에서 바로 알린다.
        */}
        <fieldset className="space-y-[var(--form-gap)] rounded-md border border-border p-4">
          <legend className="px-1 text-[length:var(--font-size-body)] font-semibold text-foreground">작성·참여·첨부</legend>
          <p className="text-xs text-muted-foreground">끄면 새 입력만 막고 이미 있는 댓글·평가·첨부·추천은 그대로 둡니다.</p>
          <div className="space-y-1.5">
            <Label htmlFor="board-settings-private-policy">비밀글 정책</Label>
            <select
              id="board-settings-private-policy"
              value={toPrivatePostPolicy(value('prvtPstPlcyCd'))}
              disabled={!canUpdate || saving}
              aria-describedby={['board-settings-private-policy-hint', policyWarnings.length > 0 ? 'board-settings-private-policy-warning' : null]
                .filter(Boolean).join(' ')}
              onChange={(event) => edit('prvtPstPlcyCd', toPrivatePostPolicy(event.target.value))}
              className="h-[var(--control-h)] w-full rounded-md border border-border bg-card px-3 text-[length:var(--font-size-body)] sm:w-60"
            >
              {PRIVATE_POST_POLICIES.map((policy) => <option key={policy} value={policy}>{PRIVATE_POST_POLICY_OPTIONS[policy]}</option>)}
            </select>
            <p id="board-settings-private-policy-hint" className="text-xs text-muted-foreground">
              정책은 앞으로 저장하는 글에 적용되고, 이미 있는 비밀글은 정책을 바꿔도 계속 보호됩니다. 기존 게시판 기본값: 없음.
            </p>
            {policyWarnings.length > 0 && (
              <div id="board-settings-private-policy-warning" role="note" className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-foreground">
                <ul className="list-disc space-y-1 pl-5">{policyWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
              </div>
            )}
          </div>
          {switchRow('rcmdtnUseYn', '추천 받기',
            '끄면 새 추천만 막습니다. 쌓인 추천 수는 그대로이고 각자 자기 추천은 거둘 수 있습니다. 기존 게시판 기본값: 받음.')}
          {switchRow('ansYn', '댓글 받기')}
          {switchRow('stsfdgYn', '만족도 평가 받기')}
          {switchRow('fileAtchPsbltyYn', '파일 첨부 허용')}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="board-settings-file-qty">첨부 파일 수(0 은 상한 없음)</Label>
              <Input
                id="board-settings-file-qty"
                type="number"
                min={0}
                max={SERVER_MAX_FILES_PER_REQUEST}
                {...validation.fieldProps('atchPsbltyFileQty')}
                value={String(value('atchPsbltyFileQty') ?? '')}
                disabled={!canUpdate || saving}
                onChange={(event) => { validation.clearError('atchPsbltyFileQty'); edit('atchPsbltyFileQty', event.target.value === '' ? Number.NaN : Number(event.target.value)); }}
              />
              {validation.errors.atchPsbltyFileQty ? <p {...validation.messageProps('atchPsbltyFileQty')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="board-settings-file-size">파일당 크기(MB, 0 은 전역 상한)</Label>
              <Input
                id="board-settings-file-size"
                type="number"
                min={0}
                max={SERVER_MAX_FILE_SIZE_MB}
                step="0.5"
                {...validation.fieldProps('atchPsbltyFileSzMb')}
                value={String(Number(value('atchPsbltyFileSz')) / BYTES_PER_MB)}
                disabled={!canUpdate || saving}
                onChange={(event) => { validation.clearError('atchPsbltyFileSzMb'); edit('atchPsbltyFileSz', event.target.value === '' ? Number.NaN : Math.round(Number(event.target.value) * BYTES_PER_MB)); }}
              />
              {validation.errors.atchPsbltyFileSzMb ? <p {...validation.messageProps('atchPsbltyFileSzMb')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <span role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">
            {canUpdate ? `변경 ${changes.length.toLocaleString()}건` : '설정을 바꿀 권한이 없습니다(게시판 관리 수정 권한).'}
          </span>
          {canUpdate && (
            <>
              <Button type="button" variant="outline" size="sm" disabled={changes.length === 0 || saving}
                onClick={() => { setDraft({}); validation.setFormErrors({}, false); setConflict(false); }}>
                변경 취소
              </Button>
              <Button type="submit" size="sm" disabled={changes.length === 0 || saving}>변경 내용 확인</Button>
            </>
          )}
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setHistoryOpen(true)}>
            <History className="size-4" aria-hidden="true" />
            변경 이력
          </Button>
        </div>
      </form>

      {canDelete && (
        <section aria-labelledby="board-settings-purge" className="space-y-2 rounded-md border border-destructive/30 p-4">
          <h2 id="board-settings-purge" className="text-[length:var(--font-size-body)] font-semibold text-foreground">영구 삭제</h2>
          <p className="text-[length:var(--font-size-body)] text-muted-foreground">
            사용 안 함 게시판만 영구 삭제할 수 있고, 글이 한 번이라도 있었던 게시판은 영구 삭제할 수 없습니다(지운 글도 기록이 남습니다).
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="gap-1.5"
            disabled={detail.useYn !== 'N' || deleting || saving}
            aria-busy={deleting || undefined}
            onClick={() => void purge()}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
            게시판 영구 삭제
          </Button>
          {detail.useYn !== 'N' && <p className="text-xs text-muted-foreground">먼저 게시판 사용을 사용 안 함으로 바꿔 저장하세요.</p>}
        </section>
      )}

      <StandardModal
        isOpen={reviewOpen}
        onClose={() => { if (!saving) setReviewOpen(false); }}
        closeDisabled={saving}
        title="변경 내용 확인"
        maxWidth="3xl"
        footer={(
          <>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setReviewOpen(false)}>돌아가기</Button>
            <Button type="button" disabled={saving} aria-busy={saving || undefined} onClick={() => void save()}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {saving ? '저장 중…' : '설정 저장'}
            </Button>
          </>
        )}
      >
        <div className="space-y-3 pt-2">
          <div className="relative overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">바꿀 설정</caption>
              <thead className="bg-muted">
                <tr>{['항목', '현재', '변경 후', '영향'].map((title) => <th key={title} scope="col" className="p-3">{title}</th>)}</tr>
              </thead>
              <tbody>
                {changes.map((field) => (
                  <tr key={field.key} className="border-t border-border">
                    <th scope="row" className="p-3 font-medium">{field.label}</th>
                    <td className="p-3">{field.format(baseline[field.key])}</td>
                    <td className="p-3">{field.format(draft[field.key])}</td>
                    <td className="p-3 text-muted-foreground">{field.impact?.(draft[field.key]) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {draft.rsvtPstgPsbltyYn === 'Y' && baseline.rsvtPstgPsbltyYn !== 'Y' && (
            <p role="note" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[length:var(--font-size-body)] text-foreground">
              예약 게시를 켜도 이미 있는 글은 바뀌지 않습니다. 예전에 기록용으로 남긴 미래 시작일 글은 그 시작일까지 이미 숨겨져 있습니다
              (전환 진단 대상). 그런 글을 바로 공개하려면 게시물 탭의 일정 바꾸기로 시작일을 당기세요.
            </p>
          )}
          {'prvtPstPlcyCd' in draft && draft.prvtPstPlcyCd !== baseline.prvtPstPlcyCd && policyWarnings.length > 0 && (
            <div role="note" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[length:var(--font-size-body)]">
              <p className="font-medium text-foreground">바꾸는 비밀글 정책이 이 게시판의 쓰임과 맞지 않을 수 있습니다.</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">{policyWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          )}
          {draft.useYn === 'N' && usage.length > 0 && (
            <div role="note" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[length:var(--font-size-body)]">
              <p className="font-medium text-foreground">이 게시판을 앱이 직접 씁니다. 사용 안 함으로 바꾸면 아래에서 보이지 않습니다.</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">{usage.map((note) => <li key={note}>{note}</li>)}</ul>
            </div>
          )}
        </div>
      </StandardModal>

      {historyOpen && (
        <BoardChangeHistoryDialog bbsId={detail.bbsId} boardName={detail.bbsTtl} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  );
}
