'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowDown, ArrowUp, FileText, History, Plus, RefreshCcw, Save, UserPlus, UserRound, X } from 'lucide-react';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { ApproverInlinePicker, INELIGIBLE_REASONS, REFERENCE_INELIGIBLE_REASONS } from './ApproverInlinePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorSummary } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/app/components/ui/toast';
import { AbsenceBadge } from '@/app/components/ui/absence-badge';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { canPermission } from '@/lib/auth/permissions';
import { ApprovalDraftRequestSchema, ApprovalStageRequestSchema } from '@/types/generated-zod';
import type { UserSearchResult } from '@/services/business/user/UserSearchService';
import {
  approvalUserService,
  type ApprovalReferee,
  type ApprovalStageRequest,
  type ApprovalTemporaryDraft,
  type ApprovalTemporaryDraftReference,
  type ApprovalTemporaryDraftSummary,
  type ApproverProfile,
  type InformalSanctionDto,
} from '@/services/business/user/approval/ApprovalUserService';
import type { components } from '@/types/generated-api';
import { approvalKeys, approvalMutationOptions, approvalQueryOptions } from '@/queries/approval-query-options';

const LABELS = { taskSeCd: '업무 구분', docTtl: '제목', docCn: '본문', reqYmd: '신청일', stages: '결재선', references: '참조자' };
/** 결재선 단계(step 1)의 칸 — 결재선과 참조자. 서버 필드 오류가 이 칸이면 내용 작성 단계로 보내지 않는다. */
function isLineField(key: string): boolean {
  return key === 'stages' || key.startsWith('stages.') || key.startsWith('stages[') || key === 'references' || key.startsWith('references');
}
const contentSchema = ApprovalDraftRequestSchema.pick({ taskSeCd: true, docTtl: true, docCn: true, reqYmd: true }).extend({
  taskSeCd: z.string().trim().min(1, '업무 구분을 선택해 주세요.').max(12),
  docTtl: z.string().trim().min(1, '제목을 입력해 주세요.').max(256, '제목은 256자 이내로 입력해 주세요.'),
  docCn: z.string().max(4000, '본문은 4000자 이내로 입력해 주세요.'),
  reqYmd: z.string().regex(/^\d{8}$/, '신청일을 확인해 주세요.'),
});
const stageSchema = ApprovalStageRequestSchema.extend({
  kind: z.enum(['APPROVAL', 'AGREEMENT']),
  approverIds: z.array(z.string().trim().min(1).max(20)).min(1, '이 단계의 결재자를 선택해 주세요.').max(10, '한 단계에는 최대 10명을 지정할 수 있습니다.'),
});
const draftSchema = ApprovalDraftRequestSchema.extend({ ...contentSchema.shape,
  stages: z.array(stageSchema).min(1, '결재 단계를 추가해 주세요.').max(10, '결재는 최대 10단계입니다.'),
  // [2026-10-04 D4] 참조자. 지정했을 때만 보낸다 — 빈 목록과 같은 뜻이다(서버도 없음을 빈 목록으로 본다).
  references: z.array(z.string().trim().min(1).max(20)).max(20, '참조자는 최대 20명입니다.').optional(),
}).superRefine((request, context) => {
  const ids = request.stages.flatMap(stage => stage.approverIds);
  if (ids.length > 50) context.addIssue({ code: 'custom', path: ['stages'], message: '전체 결재자는 최대 50명입니다.' });
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: ['stages'], message: '같은 사람을 결재선에 중복 지정할 수 없습니다.' });
  const references = request.references ?? [];
  if (new Set(references).size !== references.length) context.addIssue({ code: 'custom', path: ['references'], message: '같은 사람을 참조자로 중복 지정할 수 없습니다.' });
  // 한 사람이 같은 차수에 결재자이면서 참조자일 수 없다 — 서버도 400 으로 거부한다.
  if (references.some(id => ids.includes(id))) context.addIssue({ code: 'custom', path: ['references'], message: '결재선에 있는 사람은 참조자로 지정할 수 없습니다.' });
});

// 화면 편집 상태만 소유한다. API 요청과 응답은 생성 계약을 참조한다.
type StageEditor = { key: number; kind: ApprovalStageRequest['kind']; users: UserSearchResult[] };
type LineSuggestion = components['schemas']['ApprovalLineSuggestionDto'];

/** 마지막으로 고른 업무 구분 — 이 브라우저에만 사용자별로 둔다. 쓸 수 없으면 기억하지 않을 뿐이다. */
const lastTaskKey = (esntlId?: string) => `approval.lastTaskType.${esntlId ?? 'anonymous'}`;
function readLastTask(esntlId?: string): string {
  try { return window.localStorage.getItem(lastTaskKey(esntlId)) ?? ''; } catch { return ''; }
}
function rememberTask(esntlId: string | undefined, taskSeCd: string) {
  try { window.localStorage.setItem(lastTaskKey(esntlId), taskSeCd); } catch { /* 저장소를 못 써도 상신은 이미 끝났다. */ }
}

function stagesFrom(document?: InformalSanctionDto): StageEditor[] {
  if (!document?.stages?.length) return [{ key: 0, kind: 'APPROVAL', users: [] }];
  return document.stages.map((stage, index) => {
    const kind = stage.kind;
    if (kind !== 'APPROVAL' && kind !== 'AGREEMENT') throw new Error('결재 단계 유형을 확인할 수 없습니다. 문서 상세를 다시 불러와 주세요.');
    return { key: index, kind, users: (stage.approvers ?? []).map(person => ({ esntlId: person.userId, userNm: person.userNm })) };
  });
}

/**
 * 재상신·복제로 가져오는 참조자(D4) — 결재선처럼 원 문서의 <b>그 차수</b>에 지정된 참조자를 가져오고, 상신 때 서버가 다시 검사한다.
 * 참조는 차수마다 기록되므로 다시 보내면 새 차수의 지정이 된다(그 차수의 최종 결과 알림을 받는다). 더 이전 차수에만 지정된
 * 사람은 앞 차수에서 이미 다시 지정하지 않은 것이라 가져오지 않는다 — 그래도 문서는 계속 읽는다.
 * 원 문서 결재선에 든 사람과 본인은 뺀다(한 사람이 같은 차수에 결재자이면서 참조자일 수 없다).
 */
function refereesFrom(document: InformalSanctionDto | undefined, selfId: string | undefined): UserSearchResult[] {
  const lineIds = new Set((document?.stages ?? []).flatMap(stage => (stage.approvers ?? []).map(person => person.userId)));
  const cycle = document?.atrzCycl ?? 1;
  const seen = new Set<string>();
  return (document?.references ?? []).filter((person): person is ApprovalReferee & { userId: string } => {
    const id = person.userId;
    if (!id || id === selfId || lineIds.has(id) || seen.has(id) || (person.atrzCycl ?? cycle) !== cycle) return false;
    seen.add(id);
    return true;
  }).map(person => ({ esntlId: person.userId, userNm: person.userNm || UNKNOWN_USER, deptNm: person.deptNm ?? undefined }));
}

function describeLine(line: LineSuggestion): string {
  return (line.stages ?? []).map((stage, index) => `${index + 1}단계 ${stage.kind === 'AGREEMENT' ? '합의' : '결재'} ${(stage.approvers ?? []).map(person => person.userNm || person.esntlId).join(', ')}`).join(' → ');
}

/** 한 사람이 둘 수 있는 기안 임시저장 수 — 서버(ApprovalTemporaryDraftService.MAX_DRAFTS)와 같은 값이다. */
const TEMPORARY_DRAFT_LIMIT = 20;
/** 한 문서의 참조자 상한 — 서버(InformalSanctionService.MAX_REFERENCES)와 같은 값이다. 문서에 누적된 서로 다른 사람 수다. */
const REFERENCE_LIMIT = 20;
/** 이름을 받지 못한 결재자. 식별자를 이름 자리에 보이지 않는다(DEC-OPS-141·193). */
const UNKNOWN_USER = '알 수 없는 사용자';

/**
 * 서버 오류 응답의 상태와 오류 코드. 409 는 버전 충돌(C013)·상한(C014)이 같은 상태를 쓰므로 코드로 가른다 —
 * 상태만 보면 상한에 걸린 새 기안이 '다른 곳에서 바뀌었다' 는 안내에 갇힌다.
 */
function responseError(error: unknown): { status?: number; code?: string } {
  if (typeof error !== 'object' || error === null || !('response' in error)) return {};
  const response = (error as { response?: { status?: unknown; data?: { code?: unknown } } }).response;
  return {
    status: typeof response?.status === 'number' ? response.status : undefined,
    code: typeof response?.data?.code === 'string' ? response.data.code : undefined,
  };
}

/** 서버 일시(시간대 없는 서버 시각)를 yyyy-MM-dd HH:mm 으로 읽는다. 브라우저 시간대로 바꾸지 않는다. */
function savedAtLabel(value?: string | null): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value ?? '');
  return match ? `${match[1]} ${match[2]}` : '';
}

function temporaryDraftLabel(draft: { docTtl?: string | null }): string {
  return draft.docTtl?.trim() || '제목 없는 기안';
}

/**
 * 목록 행을 부를 이름. 제목이 같은 임시저장('제목 없는 기안' 여러 건 등)이 있으면 저장 시각을 붙여 가른다 — 버튼 이름과
 * 삭제 확인이 같으면 보조기술 사용자가 어느 임시저장을 지우는지 알 수 없다.
 */
function temporaryDraftNames(drafts: readonly ApprovalTemporaryDraftSummary[]): Map<number, string> {
  const counts = new Map<string, number>();
  for (const draft of drafts) counts.set(temporaryDraftLabel(draft), (counts.get(temporaryDraftLabel(draft)) ?? 0) + 1);
  const names = new Map<number, string>();
  for (const draft of drafts) {
    if (typeof draft.temporaryDraftSn !== 'number') continue;
    const label = temporaryDraftLabel(draft);
    names.set(draft.temporaryDraftSn, (counts.get(label) ?? 0) > 1
      ? `${label} · ${savedAtLabel(draft.mdfcnDt) || '저장 시각 미확인'}`
      : label);
  }
  return names;
}
interface ApprovalDraftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (ifmlAtrzSn: number) => void;
  resubmission?: InformalSanctionDto;
  /** 복제해서 새로 기안 — 내용과 결재선만 가져오고 새 문서로 상신한다. */
  template?: InformalSanctionDto;
}

export function ApprovalDraftDialog({ isOpen, onClose, onCreated, resubmission, template }: ApprovalDraftDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  // 확인 대화 함수. 이름을 `confirm` 으로 두지 않는다 — 쓰기 권한 census(축 3)가 이 파일이 import 하는 결재 쿼리 모듈의
  // `confirm`(승인·반려, APPROVAL_APPROVE)을 이름으로 맞춰, 승인하지 않는 기안 창을 승인 권한이 필요한 화면으로 센다.
  const askConfirm = useConfirm();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const source = resubmission ?? template;
  // 새 기안은 마지막으로 쓴 업무 구분으로 시작한다. 지금 쓸 수 없는 코드면 아래에서 비운다.
  const [taskSeCd, setTaskSeCd] = useState(() => source?.taskSeCd ?? readLastTask(user?.esntlId));
  // 업무 구분을 사용자가 고르거나 문서·임시저장에서 가져왔는가. 기억해 둔 마지막 업무 구분은 미리 채운 기본값일 뿐이라
  // 그것만으로 임시저장하면 빈 임시저장이 20건 상한을 차지한다.
  const [taskChosen, setTaskChosen] = useState(() => Boolean(source?.taskSeCd));
  const [docTtl, setDocTtl] = useState(source?.docTtl ?? '');
  const [docCn, setDocCn] = useState(source?.docCn ?? '');
  const [reqYmd, setReqYmd] = useState(() => getTodayYmd());
  const [stages, setStages] = useState<StageEditor[]>(() => stagesFrom(source));
  const nextKey = useRef(stages.length);
  const [pickerStage, setPickerStage] = useState<number | null>(null);
  /*
   * [2026-10-04 D4] 이 차수에 지정할 참조자. 결재하지 않고 문서를 읽기만 하는 사람이다. 재상신·복제하면 원 문서 그 차수의 참조자를
   * 결재선처럼 가져온다. 참조는 지울 수 없어, 재상신에서 이 목록에서 빼도 이미 참조된 사람은 문서를 계속 읽는다 — 이번 차수의
   * 최종 결과 알림만 받지 않는다.
   */
  // 재상신은 이전 차수 참조자를 미리 채우지 않는다 — 이번 차수에 한 명이라도 지정하면 그 차수에는 결재자가 참조자를 더할 수 없으므로
  // (D4 규칙 3) 기안자가 '계속 읽는 이전 참조자' 목록에서 직접 다시 지정하게 한다. 복제는 새 문서라 원 문서 참조자를 가져온다.
  const [referees, setReferees] = useState<UserSearchResult[]>(() => (resubmission ? [] : refereesFrom(template, user?.esntlId)));
  // 복제로 실제로 가져온 참조자 수 — 원 문서에 참조자가 있어도 결재선·본인과 겹쳐 하나도 못 가져올 수 있다.
  const [carriedRefereeCount] = useState(() => (resubmission ? 0 : refereesFrom(template, user?.esntlId).length));
  const [refereePickerOpen, setRefereePickerOpen] = useState(false);
  const refereePickerButton = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState('');
  const [serverError, setServerError] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const [latestDocument, setLatestDocument] = useState<InformalSanctionDto>();
  // 재상신에서 이 문서에 이미 참조된 사람(어느 차수든). 충돌 뒤 최신 문서를 불러왔으면 그 문서의 참조자다. 이 사람들은 문서를 계속 읽고,
  // 문서당 20명은 이 사람들과 새로 지정할 사람을 합친 서로 다른 사람 수다.
  const existingReferees = useMemo<ApprovalReferee[]>(
    () => (resubmission ? (latestDocument ?? resubmission).references ?? [] : []),
    [resubmission, latestDocument],
  );
  const [expectedVersion, setExpectedVersion] = useState(resubmission?.version);
  const [refreshing, setRefreshing] = useState(false);
  const [edited, setEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checked, setChecked] = useState<ApproverProfile[]>([]);
  // 사전 확인에서 결재자가 될 수 없다고 나온 사람이 있으면 상신을 막고 결재선을 고치게 한다.
  const [blockedMessage, setBlockedMessage] = useState('');
  // 참조자도 같은 사전 확인으로 본다(사용 중·결재 조회 권한). 지정할 수 없는 사람이 있으면 상신을 막고 참조자를 고치게 한다.
  const [refereeBlockedMessage, setRefereeBlockedMessage] = useState('');
  const pendingRef = useRef(false);
  const submittedRef = useRef(false);
  // 사전 확인 요청 번호 — 늦게 도착한 앞 확인이 고친 결재선의 결과를 덮지 않게 한다(피커의 검색과 같은 방식).
  const precheckRef = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pickerButtons = useRef(new Map<number, HTMLButtonElement>());
  const stageHeadings = useRef(new Map<number, HTMLHeadingElement>());
  const taskTypes = useQuery({ ...approvalQueryOptions.taskTypes(), enabled: isOpen });
  const createMutation = useMutation(approvalMutationOptions.create(queryClient));
  const resubmitMutation = useMutation(approvalMutationOptions.resubmit(queryClient));
  /*
   * [2026-10-03 D3] 기안 임시저장. 저장·이어 쓰기·삭제는 기안 권한으로 연다 — 결재함의 '새 결재 기안' 과 같은 판정이다
   * (표시 판정일 뿐 서버 인가는 그대로다). 재상신은 버전이 있는 기존 문서라 임시저장하지 않는다.
   * 창을 열 때 임시저장을 이어 쓸지 묻지 않는다 — 목록에서 사용자가 고른다.
   */
  const canSaveTemporary = !resubmission && canPermission(user, 'APPROVAL_CREATE');
  // 복제 기안 창에도 둔다. 상한(20건) 안내와 409(C014) 문구가 이 목록을 가리키므로, 없으면 창을 닫아야 지울 수 있다.
  const showsTemporaryList = canSaveTemporary;
  // 이 창이 이어 쓰는 임시저장(번호·읽은 버전). 저장하면 받은 버전으로, 상신하면 서버가 이 버전과 함께 지운다.
  const [temporaryDraft, setTemporaryDraft] = useState<ApprovalTemporaryDraftReference>();
  const [temporaryNotice, setTemporaryNotice] = useState('');
  // 이어 쓰던 임시저장이 다른 곳에서 바뀌었거나 사라졌다 — 사용자가 다시 불러오거나 연결을 끊을 때까지 저장·상신을 막는다.
  const [temporaryConflict, setTemporaryConflict] = useState(false);
  const [savingTemporary, setSavingTemporary] = useState(false);
  const [deletingDraftSn, setDeletingDraftSn] = useState<number | null>(null);
  const [resumingDraftSn, setResumingDraftSn] = useState<number | null>(null);
  const temporaryDrafts = useQuery({ ...approvalQueryOptions.temporaryDrafts(), enabled: isOpen && canSaveTemporary });
  const saveTemporaryMutation = useMutation(approvalMutationOptions.saveTemporary(queryClient));
  const deleteTemporaryMutation = useMutation(approvalMutationOptions.deleteTemporary(queryClient));
  const temporaryCount = temporaryDrafts.data?.length ?? 0;
  const temporaryNames = useMemo(() => temporaryDraftNames(temporaryDrafts.data ?? []), [temporaryDrafts.data]);
  const temporaryName = (summary: ApprovalTemporaryDraftSummary) =>
    (typeof summary.temporaryDraftSn === 'number' ? temporaryNames.get(summary.temporaryDraftSn) : undefined) ?? temporaryDraftLabel(summary);
  // 새로 저장할 자리가 없다. 이어 쓰는 임시저장은 같은 행을 바꾸므로 상한과 관계없다.
  const temporaryFull = !temporaryDraft && temporaryDrafts.isSuccess && temporaryCount >= TEMPORARY_DRAFT_LIMIT;
  const taskOptions = useMemo(() => (taskTypes.data ?? []).filter(code => code.useYn === 'Y' && code.dtlCd), [taskTypes.data]);
  const hasTaskTypes = taskOptions.length > 0;
  // 기억해 둔 업무 구분이 더는 쓰이지 않으면 고른 것으로 보지 않는다.
  const effectiveTask = taskTypes.isSuccess && !taskOptions.some(code => code.dtlCd === taskSeCd) ? '' : taskSeCd;
  const taskTemplate = taskOptions.find(code => code.dtlCd === effectiveTask)?.dtlCdExpln?.trim() ?? '';
  const suggestions = useQuery({ ...approvalQueryOptions.suggestions(effectiveTask), enabled: isOpen && step === 1 && !resubmission });
  const absentById = new Map(checked.map(profile => [profile.esntlId, Boolean(profile.absent)]));
  const content = { taskSeCd: effectiveTask, docTtl, docCn, reqYmd };
  const refereeIds = referees.map(person => person.esntlId ?? '');
  const lineIds = stages.flatMap(stage => stage.users.map(person => person.esntlId ?? ''));
  const existingRefereeIds = existingReferees.map(person => person.userId ?? '');
  // 문서에 누적된 서로 다른 참조자 수 — 이미 참조된 사람을 이번 차수에 다시 지정해도 늘지 않는다.
  const refereeTotal = new Set([...existingRefereeIds, ...refereeIds]).size;
  // 이미 참조됐지만 이번 차수에는 지정하지 않은 사람(재상신). 계속 읽고, 다시 지정하면 이번 차수의 결과 알림도 받는다.
  const earlierReferees = existingReferees.filter(person => person.userId && !refereeIds.includes(person.userId));
  const values = {
    ...content,
    stages: stages.map(stage => ({ kind: stage.kind, approverIds: stage.users.map(person => person.esntlId ?? '') })),
    ...(refereeIds.length > 0 ? { references: refereeIds } : {}),
  };
  const stageLabels = Object.fromEntries(stages.map((_, index) => [`stages.${index}.approverIds`, `${index + 1}단계 결재자`]));
  const stageFocus = Object.fromEntries(stages.map((stage, index) => [`stages.${index}.approverIds`, () => pickerButtons.current.get(stage.key) ?? null]));
  const contentValidation = useManualFormValidation(contentSchema, { form: () => formRef.current, labels: LABELS });
  const draftValidation = useManualFormValidation(draftSchema, {
    form: () => formRef.current, labels: { ...LABELS, ...stageLabels },
    focusTargets: { ...stageFocus, stages: () => pickerButtons.current.get(stages[0]?.key) ?? null, references: () => refereePickerButton.current },
  });
  const validation = step === 0 ? contentValidation : draftValidation;
  const close = useDirtyCloseGuard(edited, onClose);
  useUnsavedChanges(() => ({ dirty: edited && !submittedRef.current, pending: (pendingRef.current || refreshing) && !submittedRef.current }));
  const totalApprovers = stages.reduce((count, stage) => count + stage.users.length, 0);
  // 결재자가 없는 단계는 임시저장하지 않는다(서버도 받지 않는다). 결재선을 만들기 시작했을 때만 그 사실을 말한다 —
  // 아직 손대지 않은 기본 단계 하나를 두고 매번 알리지 않는다.
  const emptyStageCount = stages.filter(stage => stage.users.length === 0).length;
  const lineStarted = step > 0 || stages.length > 1 || totalApprovers > 0;
  const touch = () => { setEdited(true); if (!needsReview && !temporaryConflict) setServerError(''); };
  const focusAfterRender = (target: () => HTMLElement | null | undefined) => {
    const origin = document.activeElement;
    requestAnimationFrame(() => {
      // 피커 닫힘과 DOM 갱신을 기다리는 동안 사용자가 옮긴 초점을 빼앗지 않는다.
      if (document.activeElement === origin || document.activeElement === document.body) target()?.focus();
    });
  };
  const changeStep = (next: number) => {
    setStep(next);
    focusAfterRender(() => headingRef.current);
  };
  const updateStage = (key: number, update: (stage: StageEditor) => StageEditor) => {
    touch(); draftValidation.setFormErrors({}, false);
    setStages(current => current.map(stage => stage.key === key ? update(stage) : stage));
  };
  const moveStage = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= stages.length || submitting) return;
    const key = stages[index].key;
    touch(); draftValidation.setFormErrors({}, false);
    setStages(current => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
    setNotice(`${index + 1}단계를 ${destination + 1}단계로 이동했습니다.`);
    focusAfterRender(() => stageHeadings.current.get(key));
  };
  const removeStage = (index: number) => {
    if (stages.length <= 1 || submitting) return;
    const nextFocusKey = stages[index === stages.length - 1 ? index - 1 : index + 1].key;
    touch(); draftValidation.setFormErrors({}, false);
    setStages(current => current.filter(stage => stage.key !== stages[index].key));
    setNotice(`${index + 1}단계를 삭제했습니다. 남은 결재 순서를 확인해 주세요.`);
    focusAfterRender(() => stageHeadings.current.get(nextFocusKey));
  };
  /** 제안된 결재선을 그대로 가져온다. 지금 결재자가 될 수 없는 사람은 다음 단계의 사전 확인이 알려 준다. */
  const applyLine = (line: LineSuggestion) => {
    touch(); draftValidation.setFormErrors({}, false);
    const next = (line.stages ?? []).map(stage => ({
      key: nextKey.current++,
      kind: (stage.kind === 'AGREEMENT' ? 'AGREEMENT' : 'APPROVAL') as ApprovalStageRequest['kind'],
      users: (stage.approvers ?? []).filter(person => person.esntlId && person.esntlId !== user?.esntlId)
        .map(person => ({ esntlId: person.esntlId, userNm: person.userNm, deptNm: person.deptNm })),
    }));
    if (next.length === 0) return;
    setStages(next);
    // 가져온 결재선에 참조자로 고른 사람이 있으면 참조자에서 뺀다 — 한 사람이 결재자이면서 참조자일 수 없다. 조용히 빼지 않고 말한다.
    const nextIds = new Set(next.flatMap(stage => stage.users.map(person => person.esntlId ?? '')));
    const moved = referees.filter(person => nextIds.has(person.esntlId ?? ''));
    if (moved.length > 0) setReferees(current => current.filter(person => !nextIds.has(person.esntlId ?? '')));
    setNotice(`결재선을 가져왔습니다: ${describeLine(line)}${moved.length > 0
      ? ` 결재선에 든 ${moved.map(person => person.userNm || UNKNOWN_USER).join(', ')}는 참조자에서 뺐습니다.` : ''}`);
  };
  /** 최근 결재자를 마지막 단계에 더한다. */
  const addRecent = (person: ApproverProfile) => {
    const target = stages[stages.length - 1];
    if (!person.esntlId || !target) return;
    if (stages.some(stage => stage.users.some(item => item.esntlId === person.esntlId))) { setNotice('이미 결재선에 지정된 사람입니다.'); return; }
    if (refereeIds.includes(person.esntlId)) { setNotice('참조자로 지정한 사람입니다. 참조자에서 뺀 뒤 결재선에 넣어 주세요.'); return; }
    if (target.users.length >= 10 || totalApprovers >= 50) { setNotice('결재자 지정 한도를 확인해 주세요.'); return; }
    updateStage(target.key, current => ({ ...current, users: [...current.users, { esntlId: person.esntlId, userNm: person.userNm, deptNm: person.deptNm }] }));
    setNotice(`${person.userNm || '선택한 사용자'}를 ${stages.length}단계에 추가했습니다.`);
  };
  /**
   * 최종 확인 단계로 넘어가면서 결재자가 될 수 있는지 서버에 묻는다(상신 때 검사와 같은 판정). 기다리게 하지 않는다 —
   * 결과가 오면 부재 표시를 붙이고, 될 수 없는 사람이 있으면 상신을 막는다. 확인하지 못하면 막지 않는다(상신 때 서버가 다시 본다).
   *
   * [2026-10-03] 마지막 요청의 결과만 받는다. 종전에는 '이전' 으로 돌아가 결재선을 고친 뒤 다시 넘어오면, 늦게 도착한
   * 앞 확인이 이미 뺀 사람을 들어 상신을 막았다.
   */
  const precheckApprovers = async (ids: string[], refereeCheckIds: readonly string[] = []) => {
    const request = ++precheckRef.current;
    void precheckReferees(refereeCheckIds, request);
    try {
      const profiles = await approvalUserService.checkApprovers(ids);
      if (request !== precheckRef.current || !Array.isArray(profiles)) return;
      setChecked(profiles);
      const blocked = profiles.filter(profile => !profile.eligible);
      if (blocked.length === 0) return;
      const names = new Map(stages.flatMap(stage => stage.users).map(person => [person.esntlId, person.userNm]));
      setBlockedMessage(`결재자로 지정할 수 없는 사람이 있습니다: ${blocked.map(profile => `${profile.userNm || names.get(profile.esntlId) || profile.esntlId}(${INELIGIBLE_REASONS[profile.ineligibleReason ?? ''] ?? '확인 필요'})`).join(', ')}. ‘이전’ 으로 돌아가 결재선을 고쳐 주세요.`);
    } catch {
      // 사전 확인은 도움말이다. 실패해도 상신은 서버가 같은 규칙으로 판정한다.
    }
  };
  /**
   * 새로 지정할 참조자도 상신 때 검사와 같은 판정(사용 중·결재 조회 권한)으로 미리 본다(D4). 복제·임시저장으로 가져온 참조자는
   * 그사이 사용 중지됐거나 권한을 잃었을 수 있다. 결재선 확인과 같은 요청 번호를 써서 늦게 온 앞 확인을 버린다.
   */
  const precheckReferees = async (ids: readonly string[], request: number) => {
    if (ids.length === 0) return;
    try {
      const profiles = await approvalUserService.checkApprovers([...ids]);
      if (request !== precheckRef.current || !Array.isArray(profiles)) return;
      const blocked = profiles.filter(profile => !profile.referenceEligible);
      if (blocked.length === 0) return;
      const names = new Map(referees.map(person => [person.esntlId, person.userNm]));
      setRefereeBlockedMessage(`참조자로 지정할 수 없는 사람이 있습니다: ${blocked.map(profile => `${profile.userNm || names.get(profile.esntlId) || UNKNOWN_USER}(${REFERENCE_INELIGIBLE_REASONS[profile.referenceIneligibleReason ?? ''] ?? '확인 필요'})`).join(', ')}. ‘이전’ 으로 돌아가 참조자에서 빼 주세요.`);
    } catch {
      // 결재선 확인과 같다 — 도움말이며 상신 때 서버가 다시 본다.
    }
  };
  /** 이전 단계로. 최종 확인을 떠나면 진행 중인 사전 확인과 그 결과를 버린다 — 결재선을 고치면 다시 확인한다. */
  const goBack = () => {
    if (step === 2) {
      precheckRef.current += 1;
      setChecked([]);
      setBlockedMessage('');
      setRefereeBlockedMessage('');
    }
    changeStep(step - 1);
  };
  /** 펼친 피커에서 누른 사람을 넣거나 뺀다. 판정은 피커가 미리 막고, 여기서는 한 번 더 확인한다. */
  const togglePerson = (key: number, index: number, person: UserSearchResult, selected: boolean) => {
    const id = person.esntlId;
    if (!id) { setNotice('사용자 식별자를 확인할 수 없어 추가하지 않았습니다.'); return; }
    if (!selected) {
      updateStage(key, current => ({ ...current, users: current.users.filter(item => item.esntlId !== id) }));
      setNotice(`${person.userNm || '선택한 사용자'}를 ${index + 1}단계에서 뺐습니다.`);
      return;
    }
    if (id === user?.esntlId) { setNotice('자신을 결재자로 지정할 수 없습니다.'); return; }
    if (stages.some(stage => stage.users.some(item => item.esntlId === id))) { setNotice('이미 결재선에 지정된 사람입니다. 다른 사람을 선택해 주세요.'); return; }
    if (refereeIds.includes(id)) { setNotice('참조자로 지정한 사람입니다. 참조자에서 뺀 뒤 결재선에 넣어 주세요.'); return; }
    const target = stages.find(stage => stage.key === key);
    if (!target || target.users.length >= 10 || totalApprovers >= 50) { setNotice('결재자 지정 한도를 확인해 주세요.'); return; }
    updateStage(key, current => ({ ...current, users: [...current.users, person] }));
    setNotice(`${person.userNm || '선택한 사용자'}를 ${index + 1}단계에 추가했습니다.`);
  };
  /**
   * 참조자 피커에서 누른 사람을 넣거나 뺀다(D4). 본인·결재선에 든 사람·이미 이 문서의 참조자인 사람은 넣지 않고, 문서당 20명을
   * 넘기지 않는다. 판정은 피커가 미리 막고 여기서 한 번 더 본다 — 자격(사용 중·결재 조회 권한)은 피커와 최종 확인이 서버에 묻는다.
   */
  const toggleReferee = (person: UserSearchResult, selected: boolean) => {
    const id = person.esntlId;
    if (!id) { setNotice('사용자 식별자를 확인할 수 없어 추가하지 않았습니다.'); return; }
    if (!selected) {
      touch(); draftValidation.setFormErrors({}, false);
      setReferees(current => current.filter(item => item.esntlId !== id));
      // 이미 참조된 사람은 빼도 문서를 계속 읽는다 — 그 사실을 말한다(빼기가 열람 회수를 약속하지 않게).
      setNotice(existingRefereeIds.includes(id)
        ? `${person.userNm || '선택한 사용자'}를 이번 차수 참조자에서 뺐습니다. 이미 참조된 사람이라 이 문서는 계속 읽습니다.`
        : `${person.userNm || '선택한 사용자'}를 참조자에서 뺐습니다.`);
      return;
    }
    if (id === user?.esntlId) { setNotice('자신을 참조자로 지정할 수 없습니다.'); return; }
    if (lineIds.includes(id)) { setNotice('결재선에 있는 사람은 참조자로 지정할 수 없습니다.'); return; }
    if (refereeIds.includes(id)) { setNotice('이미 이번 차수의 참조자입니다.'); return; }
    if (!existingRefereeIds.includes(id) && refereeTotal >= REFERENCE_LIMIT) { setNotice(`참조자는 한 문서에 ${REFERENCE_LIMIT}명까지 지정할 수 있습니다.`); return; }
    touch(); draftValidation.setFormErrors({}, false);
    setReferees(current => [...current, person]);
    setNotice(`${person.userNm || '선택한 사용자'}를 참조자로 넣었습니다.`);
  };
  /**
   * 기안 임시저장(D3). 첫 저장은 새로 만들고, 그 뒤로는 받은 버전으로 같은 임시저장을 바꾼다. 결재자가 없는 단계는 빼고
   * 보내며 화면이 저장 전과 후에 그 사실을 말한다. 저장하는 동안 입력을 잠근다 — 저장 중에 고친 내용을 저장된 것으로
   * 표시하지 않기 위해서다. 자격(결재 권한·사용 중)은 보지 않는다 — 미완성 기안을 받고, 다시 열 때 지금 자격으로 판정한다.
   */
  const handleSaveTemporary = async () => {
    if (pendingRef.current || !canSaveTemporary || temporaryConflict) return;
    const savedStages = stages.filter(stage => stage.users.length > 0);
    if (!(taskChosen && effectiveTask) && !docTtl.trim() && !docCn.trim() && savedStages.length === 0 && referees.length === 0) {
      setServerError('저장할 내용이 없습니다. 업무 구분·제목·본문·결재선·참조자 중 하나는 채워 주세요.');
      return;
    }
    const droppedStages = lineStarted ? stages.length - savedStages.length : 0;
    // 참조자도 함께 저장한다(D4). 다시 저장은 통째로 바꾸므로, 참조자를 다 뺐으면 보내지 않는 것이 비우는 것이다.
    const payload = {
      temporaryDraftSn: temporaryDraft?.temporaryDraftSn,
      request: {
        taskSeCd: effectiveTask, docTtl, docCn,
        stages: savedStages.map(stage => ({ kind: stage.kind, approverIds: stage.users.map(person => person.esntlId ?? '') })),
        ...(refereeIds.length > 0 ? { references: refereeIds } : {}),
        ...(temporaryDraft ? { version: temporaryDraft.version } : {}),
      },
    };
    pendingRef.current = true; setSavingTemporary(true); setServerError('');
    try {
      const saved = await saveTemporaryMutation.mutateAsync(payload);
      setTemporaryDraft({ temporaryDraftSn: saved.temporaryDraftSn, version: saved.version });
      // 신청일은 임시저장하지 않는다(이어 쓰면 오늘로 시작한다). 오늘이 아닌 신청일은 저장되지 않은 변경이므로 닫을 때 계속 묻는다.
      const unsavedDate = reqYmd !== getTodayYmd();
      setEdited(unsavedDate);
      const savedAt = savedAtLabel(saved.mdfcnDt);
      setTemporaryNotice(`임시저장했습니다${savedAt ? ` · ${savedAt}` : ''}.${droppedStages > 0 ? ` 결재자가 없는 단계 ${droppedStages}개는 저장하지 않았습니다.` : ''}${unsavedDate ? ' 신청일은 저장하지 않습니다 — 이어 쓰면 오늘 날짜로 시작합니다.' : ''}`);
      toast('작성 중인 기안을 임시저장했습니다. ‘새 결재 기안’ 에서 이어 쓸 수 있습니다.', 'success');
    } catch (error: unknown) {
      const { status, code } = responseError(error);
      if (status === 409 && code === 'C014') {
        setServerError(`임시저장은 ${TEMPORARY_DRAFT_LIMIT}건까지 둘 수 있습니다. 입력은 유지됩니다. ‘임시저장한 기안’ 목록에서 쓰지 않는 임시저장을 지운 뒤 다시 저장해 주세요.`);
      } else if (temporaryDraft && ((status === 409 && code === 'C013') || status === 404)) {
        setTemporaryConflict(true);
        setServerError(status === 404
          ? '이어 쓰던 임시저장을 찾을 수 없습니다. 다른 곳에서 상신했거나 지웠을 수 있습니다. 입력은 유지됩니다. 연결을 끊으면 지금 내용을 새 임시저장으로 저장하거나 새 문서로 상신할 수 있습니다.'
          : '다른 곳에서 이 임시저장을 고쳤습니다. 입력은 유지됩니다. 최신 임시저장을 불러오거나, 연결을 끊고 지금 내용을 새 임시저장으로 저장해 주세요.');
      } else {
        setServerError(extractErrorMessage(error, '기안을 임시저장하지 못했습니다. 입력한 내용은 유지됩니다. 다시 시도해 주세요.'));
      }
      void queryClient.invalidateQueries({ queryKey: approvalKeys.temporaryDrafts() });
    } finally { pendingRef.current = false; setSavingTemporary(false); }
  };
  /**
   * 임시저장을 편집기에 채운다. 결재선은 새 key 로 만들어 단계 카드의 초점·피커 상태가 앞 내용과 섞이지 않게 한다.
   * 지금 결재자가 될 수 없는 사람은 사유를 밝히고, 최종 확인의 사전 확인이 상신을 막는다. 신청일은 저장하지 않으므로 오늘이다.
   */
  const applyTemporaryDraft = (draft: ApprovalTemporaryDraft & ApprovalTemporaryDraftReference) => {
    const nextStages: StageEditor[] = (draft.stages ?? []).map(stage => {
      const kind = stage.kind;
      if (kind !== 'APPROVAL' && kind !== 'AGREEMENT') throw new Error('임시저장의 결재 단계 유형을 확인할 수 없습니다. 다시 불러와 주세요.');
      return {
        key: nextKey.current++, kind,
        users: (stage.approvers ?? []).map(person => ({ esntlId: person.esntlId, userNm: person.userNm || UNKNOWN_USER, deptNm: person.deptNm ?? undefined, absent: person.absent ?? undefined })),
      };
    });
    const blocked = (draft.stages ?? []).flatMap(stage => stage.approvers ?? []).filter(person => person.eligible === false);
    // 참조자도 지금 자격(사용 중·결재 조회 권한)과 함께 온다(D4). 지정할 수 없는 사람은 이름 대신 사유를 밝힌다.
    const nextReferees: UserSearchResult[] = (draft.references ?? []).filter(person => person.esntlId)
      .map(person => ({ esntlId: person.esntlId, userNm: person.userNm || UNKNOWN_USER, deptNm: person.deptNm ?? undefined, absent: person.absent ?? undefined }));
    const blockedReferees = (draft.references ?? []).filter(person => person.referenceEligible === false);
    setTaskSeCd(draft.taskSeCd ?? '');
    setTaskChosen(Boolean(draft.taskSeCd));
    setDocTtl(draft.docTtl ?? '');
    setDocCn(draft.docCn ?? '');
    setReqYmd(getTodayYmd());
    setStages(nextStages.length > 0 ? nextStages : [{ key: nextKey.current++, kind: 'APPROVAL', users: [] }]);
    setReferees(nextReferees);
    setTemporaryDraft({ temporaryDraftSn: draft.temporaryDraftSn, version: draft.version });
    contentValidation.setFormErrors({}, false); draftValidation.setFormErrors({}, false);
    precheckRef.current += 1; setChecked([]); setBlockedMessage(''); setRefereeBlockedMessage(''); setPickerStage(null); setRefereePickerOpen(false);
    setTemporaryConflict(false); setServerError(''); setNotice(''); setEdited(false);
    const blockedRefereeNotice = blockedReferees.length > 0
      ? ` 참조자로 지정할 수 없는 사람이 있습니다: ${blockedReferees.map(person => `${person.userNm || UNKNOWN_USER}(${REFERENCE_INELIGIBLE_REASONS[person.referenceIneligibleReason ?? ''] ?? '확인 필요'})`).join(', ')}. 참조자에서 빼 주세요.`
      : '';
    setTemporaryNotice(blocked.length > 0
      ? `‘${temporaryDraftLabel(draft)}’ 임시저장을 불러왔습니다. 결재자로 지정할 수 없는 사람이 있습니다: ${blocked.map(person => `${person.userNm || UNKNOWN_USER}(${INELIGIBLE_REASONS[person.ineligibleReason ?? ''] ?? '확인 필요'})`).join(', ')}. 결재선에서 빼고 다른 사람을 지정해 주세요.${blockedRefereeNotice}`
      : blockedReferees.length > 0
        ? `‘${temporaryDraftLabel(draft)}’ 임시저장을 불러왔습니다.${blockedRefereeNotice}`
        : `‘${temporaryDraftLabel(draft)}’ 임시저장을 불러왔습니다. 마지막 저장 ${savedAtLabel(draft.mdfcnDt) || '시각 미확인'}. 신청일은 저장하지 않아 오늘로 시작합니다.`);
    changeStep(0);
  };
  /** 상세를 서버에서 다시 읽어 채운다. 없으면(상신했거나 지웠으면) 그 사실을 말하고 연결을 끊는다. */
  const loadTemporaryDraft = async (temporaryDraftSn: number) => {
    setResumingDraftSn(temporaryDraftSn);
    try {
      applyTemporaryDraft(await queryClient.fetchQuery(approvalQueryOptions.temporaryDraft(temporaryDraftSn)));
    } catch (error: unknown) {
      if (responseError(error).status === 404) {
        if (temporaryDraft?.temporaryDraftSn === temporaryDraftSn) { setTemporaryDraft(undefined); setTemporaryConflict(false); setEdited(true); }
        setServerError('임시저장을 찾을 수 없습니다. 다른 곳에서 상신했거나 지웠을 수 있습니다. 결재함에서 확인해 주세요. 입력은 유지됩니다.');
        void queryClient.invalidateQueries({ queryKey: approvalKeys.temporaryDrafts() });
      } else setServerError(extractErrorMessage(error, '임시저장을 불러오지 못했습니다. 입력은 유지됩니다. 다시 시도해 주세요.'));
    } finally { setResumingDraftSn(null); }
  };
  /** '이어 쓰기'. 작성 중인 내용이 있으면 바꿀지 먼저 묻는다 — 창을 열 때는 묻지 않는다. */
  const handleResumeTemporary = async (summary: ApprovalTemporaryDraftSummary) => {
    const temporaryDraftSn = summary.temporaryDraftSn;
    if (typeof temporaryDraftSn !== 'number' || pendingRef.current || resumingDraftSn !== null) return;
    // 복제해 연 내용은 손대지 않았어도 사용자가 고른 내용이다 — 임시저장으로 바꾸기 전에 묻는다.
    if ((edited || (template !== undefined && !temporaryDraft)) && !(await askConfirm({
      title: '임시저장 이어 쓰기',
      message: `지금 작성 중인 내용은 저장되지 않고 ‘${temporaryName(summary)}’ 임시저장으로 바뀝니다.`,
      confirmText: '임시저장으로 바꾸기',
      cancelText: '계속 작성',
    }))) return;
    await loadTemporaryDraft(temporaryDraftSn);
  };
  /** 충돌 뒤 '최신 임시저장 불러오기' — 다른 곳에서 고친 내용으로 바꾼다. */
  const reloadTemporaryDraft = async () => {
    if (!temporaryDraft || pendingRef.current || resumingDraftSn !== null) return;
    if (edited && !(await askConfirm({
      title: '최신 임시저장 불러오기',
      message: '지금 작성 중인 내용은 저장되지 않고 서버에 있는 최신 임시저장으로 바뀝니다.',
      confirmText: '최신 내용으로 바꾸기',
      cancelText: '계속 작성',
    }))) return;
    await loadTemporaryDraft(temporaryDraft.temporaryDraftSn);
  };
  /** 충돌 뒤 '연결을 끊고 계속 작성' — 지금 내용은 남기고, 다음 저장은 새 임시저장이, 다음 상신은 새 문서가 된다. */
  const detachTemporaryDraft = () => {
    setTemporaryDraft(undefined); setTemporaryConflict(false); setServerError(''); setEdited(true);
    setTemporaryNotice('임시저장과의 연결을 끊었습니다. 다시 임시저장하면 새 임시저장이 되고, 상신하면 새 문서로 올라갑니다.');
  };
  /** 임시저장 삭제. 확인을 받고 한 번만 지운다. 이어 쓰던 것을 지우면 입력은 남기고 연결만 끊는다. */
  const handleDeleteTemporary = async (summary: ApprovalTemporaryDraftSummary) => {
    const temporaryDraftSn = summary.temporaryDraftSn;
    if (typeof temporaryDraftSn !== 'number' || pendingRef.current) return;
    pendingRef.current = true;
    try {
      const attached = temporaryDraft?.temporaryDraftSn === temporaryDraftSn;
      const ok = await askConfirm({
        title: '임시저장 삭제',
        message: `‘${temporaryName(summary)}’ 임시저장을 지웁니다. 지운 임시저장은 되살릴 수 없습니다.${attached ? ' 지금 작성 중인 내용은 그대로 남고 임시저장과의 연결만 끊깁니다.' : ''}`,
        confirmText: '임시저장 삭제',
        variant: 'destructive',
      });
      if (!ok) return;
      setDeletingDraftSn(temporaryDraftSn);
      await deleteTemporaryMutation.mutateAsync(temporaryDraftSn);
      if (attached) { setTemporaryDraft(undefined); setTemporaryConflict(false); setEdited(true); }
      setTemporaryNotice(`‘${temporaryName(summary)}’ 임시저장을 지웠습니다.`);
    } catch (error: unknown) {
      setServerError(responseError(error).status === 404
        ? '임시저장을 찾을 수 없습니다. 다른 곳에서 상신했거나 이미 지웠을 수 있습니다. 목록을 다시 불러왔습니다.'
        : extractErrorMessage(error, '임시저장을 지우지 못했습니다. 다시 시도해 주세요.'));
      void queryClient.invalidateQueries({ queryKey: approvalKeys.temporaryDrafts() });
    } finally { pendingRef.current = false; setDeletingDraftSn(null); }
  };
  const validateStages = () => {
    const ownId = user?.esntlId;
    if (ownId && values.stages.some(stage => stage.approverIds.includes(ownId))) {
      draftValidation.setFormErrors({ stages: '자신을 결재자로 지정할 수 없습니다.' });
      return null;
    }
    if (ownId && refereeIds.includes(ownId)) {
      draftValidation.setFormErrors({ references: '자신을 참조자로 지정할 수 없습니다.' });
      return null;
    }
    // 이미 참조된 사람(재상신)도 자리를 차지한다 — 문서당 서로 다른 사람 20명이다.
    if (refereeTotal > REFERENCE_LIMIT) {
      draftValidation.setFormErrors({ references: `참조자는 한 문서에 ${REFERENCE_LIMIT}명까지 지정할 수 있습니다. 이미 ${existingRefereeIds.length}명이 참조돼 있습니다.` });
      return null;
    }
    return draftValidation.validate(values);
  };
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingRef.current || !hasTaskTypes || needsReview) return;
    if (step === 0) { if (contentValidation.validate(content)) changeStep(1); return; }
    const request = validateStages();
    if (!request) return;
    if (step === 1) {
      setChecked([]); setBlockedMessage(''); setRefereeBlockedMessage('');
      changeStep(2);
      void precheckApprovers(request.stages.flatMap(stage => stage.approverIds), request.references ?? []);
      return;
    }
    if (blockedMessage || refereeBlockedMessage || temporaryConflict) return;
    pendingRef.current = true; setSubmitting(true); setServerError('');
    try {
      let id: number;
      if (resubmission) {
        const originalId = resubmission.ifmlAtrzSn;
        const version = expectedVersion;
        if (originalId === undefined || version === undefined) {
          setNeedsReview(true);
          setServerError('현재 문서 번호와 버전을 확인할 수 없습니다. 입력은 유지됩니다. 최신 문서를 확인해 주세요.');
          return;
        }
        id = await resubmitMutation.mutateAsync({ ifmlAtrzSn: originalId, request: { ...request, version } });
      } else id = await createMutation.mutateAsync({ request, temporaryDraft });
      setEdited(false);
      submittedRef.current = true;
      rememberTask(user?.esntlId, request.taskSeCd);
      toast(resubmission ? '수정한 문서를 새 차수로 재상신했습니다.' : '결재를 상신했습니다. 결재 진행 상태는 결재함에서 확인할 수 있습니다.', 'success');
      onCreated(id); onClose();
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) {
        // 결재선·참조자 칸의 오류는 결재선 단계에 남긴다 — 내용 작성 단계로 보내면 오류 칸이 보이지 않는다.
        const isContentError = Object.keys(fieldErrors).some(key => key in LABELS && !isLineField(key));
        if (isContentError) { setStep(0); contentValidation.setFormErrors(fieldErrors); }
        else { setStep(1); draftValidation.setFormErrors(fieldErrors); }
      }
      // [2026-10-03 D3] 409 는 무엇이 부딪혔는지에 따라 길이 다르다. 재상신은 문서 버전 충돌이라 최신 문서를 확인한다.
      //   새 기안의 C013 은 이어 쓴 임시저장이 이미 상신되었거나 바뀐 것이다 — 최신 임시저장을 불러오거나 연결을 끊게 한다.
      //   종전처럼 새 기안에서 needsReview 를 켜면 '최신 문서 확인' 버튼이 없어 상신이 영영 잠긴다.
      const { status, code } = responseError(error);
      if (status === 409 && resubmission) {
        setNeedsReview(true);
        setServerError('문서가 다른 곳에서 변경되었습니다. 입력은 유지됩니다. 최신 문서를 확인한 뒤 다시 상신해 주세요.');
      } else if (status === 409 && code === 'C013' && temporaryDraft) {
        setTemporaryConflict(true);
        setServerError('이어 쓴 임시저장이 이미 상신되었거나 다른 곳에서 바뀌었습니다. 입력은 유지됩니다. 결재함에서 상신 여부를 확인한 뒤, 최신 임시저장을 불러오거나 연결을 끊고 새 문서로 상신해 주세요.');
        void queryClient.invalidateQueries({ queryKey: approvalKeys.temporaryDrafts() });
      } else setServerError(extractErrorMessage(error, '상신하지 못했습니다. 입력한 내용은 유지됩니다. 다시 시도해 주세요.'));
    } finally { pendingRef.current = false; setSubmitting(false); }
  };
  const fieldError = (name: string) => validation.errors[name]
    ? <p {...validation.messageProps(name)} className="text-sm text-destructive-emphasis" /> : null;
  const refreshVersion = async () => {
    if (resubmission?.ifmlAtrzSn === undefined || refreshing) return;
    setRefreshing(true);
    try {
      const latest = await queryClient.fetchQuery(approvalQueryOptions.detail(resubmission.ifmlAtrzSn));
      setLatestDocument(latest);
      if (!latest.canResubmit) {
        setServerError('최신 상태에서는 재상신할 수 없습니다. 입력은 유지됩니다. 결재함에서 처리 상태를 확인해 주세요.');
        return;
      }
      setExpectedVersion(latest.version);
      setServerError('최신 문서를 불러왔습니다. 아래 내용과 작성 중인 내용을 비교하고 결재선을 다시 확인해 주세요. 입력은 유지됩니다.');
      setNeedsReview(false);
      changeStep(1);
    } catch { setServerError('최신 문서를 불러오지 못했습니다. 입력은 유지됩니다. 다시 시도해 주세요.'); }
    finally { setRefreshing(false); }
  };

  return <>
    <StandardModal isOpen={isOpen} onClose={close} title={resubmission ? '결재 재상신' : template && !temporaryDraft ? '복제해서 새로 기안' : '새 결재 기안'} maxWidth="2xl" closeDisabled={submitting || savingTemporary}>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="결재 기안 폼">
        <ol aria-label="기안 작성 단계" className="flex flex-wrap gap-3 text-sm">
          {['내용 작성', '결재선', '최종 확인'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={step === index ? 'font-bold text-primary' : 'text-muted-foreground'}>{index + 1}. {label}{index < step ? ' · 완료' : ''}</li>)}
        </ol>
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-foreground focus-visible:outline-ring">{['내용 작성', '결재선 지정', '상신 전 최종 확인'][step]}</h2>
        <FormErrorSummary errors={validation.errors} labels={{ ...LABELS, ...stageLabels }} onNavigate={validation.focusError} />
        {serverError && <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-emphasis"><p>{serverError}</p>{needsReview && resubmission && <Button type="button" variant="outline" disabled={refreshing} onClick={() => { void refreshVersion(); }}>{refreshing ? '불러오는 중…' : '최신 문서 확인'}</Button>}{temporaryConflict && temporaryDraft && <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={savingTemporary || resumingDraftSn !== null} onClick={() => { void reloadTemporaryDraft(); }}>{resumingDraftSn !== null ? '불러오는 중…' : '최신 임시저장 불러오기'}</Button><Button type="button" variant="outline" disabled={savingTemporary || resumingDraftSn !== null} onClick={detachTemporaryDraft}>연결을 끊고 계속 작성</Button></div>}</div>}
        {latestDocument && <details className="rounded-md border border-border p-3 text-sm"><summary>서버의 최신 문서 · {latestDocument.atrzCycl}차 · {latestDocument.docTtl}</summary><p className="mt-2 whitespace-pre-wrap break-words">{latestDocument.docCn || '작성한 본문이 없습니다.'}</p><p className="mt-2">결재선: {(latestDocument.stages ?? []).map(stage => `${stage.order}단계 ${stage.kind === 'AGREEMENT' ? '합의' : '결재'}: ${(stage.approvers ?? []).map(person => person.userNm || person.userId).join(', ')}`).join(' → ')}</p>{(latestDocument.references?.length ?? 0) > 0 && <p className="mt-2">참조자: {(latestDocument.references ?? []).map(person => person.userNm || UNKNOWN_USER).join(', ')}</p>}</details>}
        {/* 임시저장·이어 쓰는 동안 입력을 잠근다 — 그 사이 고친 내용이 저장된 것으로 표시되거나 불러온 내용에 덮이지 않게 한다. */}
        <fieldset disabled={submitting || savingTemporary || resumingDraftSn !== null} className="min-w-0 space-y-5">
          {step === 0 && <>
            {showsTemporaryList && (temporaryDrafts.isError ? (
              // 목록을 못 읽은 것을 '임시저장이 없다' 로 보이지 않는다. 기안 작성을 막는 오류가 아니므로 경고(alert)로 끼어들지 않는다.
              <div role="status" className="space-y-2 rounded-md border border-border p-3 text-sm">
                <p>임시저장한 기안을 불러오지 못했습니다. 새 기안은 그대로 작성할 수 있습니다.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => { void temporaryDrafts.refetch(); }}><RefreshCcw aria-hidden="true" /> 임시저장 목록 다시 불러오기</Button>
              </div>
            ) : temporaryCount > 0 ? (
              <section aria-labelledby="approval-temporary-drafts-heading" className="space-y-2 rounded-md border border-border p-3">
                <h3 id="approval-temporary-drafts-heading" className="text-sm font-semibold">임시저장한 기안 ({temporaryCount}/{TEMPORARY_DRAFT_LIMIT})</h3>
                <p className="text-xs text-muted-foreground">서버에 보관되어 다른 기기에서도 이어 쓸 수 있습니다. 결재자에게 보이지 않고 알림도 가지 않습니다.</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {(temporaryDrafts.data ?? []).map(draft => <li key={draft.temporaryDraftSn} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 break-words">{temporaryDraftLabel(draft)}{draft.taskSeNm ? ` · ${draft.taskSeNm}` : ''} · 결재자 {draft.approverCount ?? 0}명{draft.referenceCount ? ` · 참조자 ${draft.referenceCount}명` : ''} · {savedAtLabel(draft.mdfcnDt) || '저장 시각 미확인'}</span>
                    <span className="flex gap-1">
                      {draft.temporaryDraftSn === temporaryDraft?.temporaryDraftSn
                        ? <span className="px-2 text-xs text-muted-foreground">지금 이어 쓰는 중</span>
                        : <Button type="button" size="sm" variant="outline" aria-label={`‘${temporaryName(draft)}’ 이어 쓰기`} disabled={resumingDraftSn !== null || deletingDraftSn !== null} onClick={() => { void handleResumeTemporary(draft); }}>{resumingDraftSn === draft.temporaryDraftSn ? '불러오는 중…' : '이어 쓰기'}</Button>}
                      <Button type="button" size="sm" variant="ghost" aria-label={`‘${temporaryName(draft)}’ 임시저장 삭제`} disabled={deletingDraftSn !== null || savingTemporary || resumingDraftSn !== null} aria-busy={deletingDraftSn === draft.temporaryDraftSn || undefined} onClick={() => { void handleDeleteTemporary(draft); }}>{deletingDraftSn === draft.temporaryDraftSn ? '삭제 중…' : '삭제'}</Button>
                    </span>
                  </li>)}
                </ul>
              </section>
            ) : null)}
            <div className="space-y-2"><label htmlFor="approval-draft-title" className="text-sm font-semibold">제목 (필수)</label><Input id="approval-draft-title" {...contentValidation.fieldProps('docTtl')} value={docTtl} maxLength={256} onChange={event => { touch(); contentValidation.clearError('docTtl'); setDocTtl(event.target.value); }} placeholder="결재할 내용을 한 문장으로 적어 주세요" />{fieldError('docTtl')}</div>
            <div className="space-y-2"><label htmlFor="approval-draft-content" className="text-sm font-semibold">본문 (선택)</label><textarea id="approval-draft-content" {...contentValidation.fieldProps('docCn')} value={docCn} maxLength={4000} rows={6} onChange={event => { touch(); contentValidation.clearError('docCn'); setDocCn(event.target.value); }} className="w-full rounded-md border border-border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" /><p className="text-xs text-muted-foreground">검토에 필요한 배경과 요청 사항을 적어 주세요. {docCn.length}/4000자</p>{fieldError('docCn')}{taskTemplate && docCn.trim() !== taskTemplate && <Button type="button" variant="outline" size="sm" onClick={() => { touch(); setDocCn(current => current.trim() ? `${current}\n\n${taskTemplate}` : taskTemplate); setNotice('업무 구분의 본문 양식을 넣었습니다.'); }}><FileText aria-hidden="true" /> 업무 양식 넣기</Button>}</div>
            <div className="space-y-2">
              <label htmlFor="approval-draft-task-type" className="text-sm font-semibold">업무 구분 (필수)</label>
              {taskTypes.isLoading ? <p role="status" className="text-sm text-muted-foreground">업무 구분을 불러오는 중입니다.</p>
                : taskTypes.isError ? <div role="alert" className="space-y-2"><p>업무 구분을 불러오지 못했습니다.</p><Button type="button" variant="outline" onClick={() => { void taskTypes.refetch(); }}><RefreshCcw aria-hidden="true" /> 다시 시도</Button></div>
                : !hasTaskTypes ? <div role="alert" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"><p>등록된 업무 구분이 없어 결재를 올릴 수 없습니다.</p><p className="mt-1 text-muted-foreground">관리자에게 업무 구분 등록을 요청해 주세요.</p></div>
                : <Select value={effectiveTask} onValueChange={value => { touch(); contentValidation.clearError('taskSeCd'); setTaskSeCd(value); setTaskChosen(true); }}><SelectTrigger id="approval-draft-task-type" {...contentValidation.fieldProps('taskSeCd')} className="w-full"><SelectValue placeholder="업무 구분을 선택하세요" /></SelectTrigger><SelectContent>{taskOptions.map(code => <SelectItem key={code.dtlCd} value={code.dtlCd}>{code.dtlCdNm || code.dtlCd}</SelectItem>)}</SelectContent></Select>}
              {fieldError('taskSeCd')}
            </div>
            <div className="space-y-2"><label htmlFor="approval-draft-req-ymd" className="text-sm font-semibold">신청일</label><Input id="approval-draft-req-ymd" {...contentValidation.fieldProps('reqYmd')} type="date" value={reqYmd.length === 8 ? `${reqYmd.slice(0, 4)}-${reqYmd.slice(4, 6)}-${reqYmd.slice(6, 8)}` : ''} onChange={event => { touch(); contentValidation.clearError('reqYmd'); setReqYmd(event.target.value.replace(/-/g, '')); }} className="max-w-xs" />{fieldError('reqYmd')}</div>
          </>}
          {step === 1 && <>
            {resubmission && <p className="rounded-md bg-muted p-3 text-sm">이전 결재선을 가져왔습니다. 결재자와 순서를 다시 확인해 주세요. 이전 차수는 이력에 보존됩니다.</p>}
            {template && !temporaryDraft && <p className="rounded-md bg-muted p-3 text-sm">복제한 문서의 결재선입니다. 결재자와 순서를 다시 확인해 주세요.</p>}
            {!resubmission && suggestions.data && (suggestions.data.lines?.length || suggestions.data.otherLines?.length || suggestions.data.recentApprovers?.length) ? (
              <section aria-label="결재선 제안" className="space-y-3 rounded-md border border-border p-3">
                {[...(suggestions.data.lines ?? []), ...(suggestions.data.otherLines ?? [])].length > 0 && <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold"><History size={14} aria-hidden="true" /> 내가 썼던 결재선</h3>
                  <ul className="space-y-1">
                    {[...(suggestions.data.lines ?? []), ...(suggestions.data.otherLines ?? [])].map((line, index) => <li key={`${line.taskSeCd}-${index}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 break-words">{line.taskSeNm || line.taskSeCd} · {line.useCount}회 · {describeLine(line)}</span>
                      <Button type="button" size="sm" variant="outline" aria-label={`${line.taskSeNm || line.taskSeCd} 결재선 가져오기: ${describeLine(line)}`} onClick={() => applyLine(line)}>가져오기</Button>
                    </li>)}
                  </ul>
                </div>}
                {(suggestions.data.recentApprovers ?? []).length > 0 && <div className="space-y-2">
                  <h3 className="text-sm font-semibold">최근 결재자 · 누르면 마지막 단계에 더합니다</h3>
                  <ul className="flex flex-wrap gap-2">
                    {/* [2026-10-03] 지정할 수 없는 사람은 누를 수 없는 버튼 대신 사유를 보이는 글로 둔다. 사유가 aria-label 에만
                        있어 화면에는 보이지 않았고, aria-label 이 '부재 중' 표시까지 덮었다. */}
                    {(suggestions.data.recentApprovers ?? []).map(person => <li key={person.esntlId}>
                      {person.eligible ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => addRecent(person)}>
                          {person.userNm || person.esntlId}{person.deptNm ? ` · ${person.deptNm}` : ''}
                          {person.absent ? <>{' '}<AbsenceBadge absent /></> : null}
                          {' '}<span className="sr-only">결재자로 더하기</span>
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground">
                          {person.userNm || person.esntlId}{person.deptNm ? ` · ${person.deptNm}` : ''}
                          {person.absent ? <>{' '}<AbsenceBadge absent /></> : null}
                          <span>· 지정할 수 없음({INELIGIBLE_REASONS[person.ineligibleReason ?? ''] ?? '확인 필요'})</span>
                        </span>
                      )}
                    </li>)}
                  </ul>
                </div>}
              </section>
            ) : null}
            <p id="approval-stage-help" className="text-sm text-muted-foreground">앞 단계의 모든 사람이 승인해야 다음 단계로 넘어갑니다. 합의 단계도 전원 동의가 필요합니다. 최대 10단계, 단계별 10명, 전체 50명이며 자기 결재와 중복 지정은 할 수 없습니다.</p>
            <ol aria-label="결재선 단계" className="space-y-3">
              {stages.map((stage, index) => <li key={stage.key} className="space-y-3 rounded-md border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 ref={node => { if (node) stageHeadings.current.set(stage.key, node); else stageHeadings.current.delete(stage.key); }} tabIndex={-1} className="font-semibold focus-visible:outline-2 focus-visible:outline-ring">{index + 1}단계 · {stage.kind === 'AGREEMENT' ? '합의' : '결재'}</h3>
                  <div className="flex gap-1"><Button type="button" size="icon" variant="ghost" aria-label={`${index + 1}단계 위로 이동`} disabled={index === 0} onClick={() => moveStage(index, -1)}><ArrowUp aria-hidden="true" /></Button><Button type="button" size="icon" variant="ghost" aria-label={`${index + 1}단계 아래로 이동`} disabled={index === stages.length - 1} onClick={() => moveStage(index, 1)}><ArrowDown aria-hidden="true" /></Button><Button type="button" size="icon" variant="ghost" aria-label={`${index + 1}단계 삭제`} disabled={stages.length === 1} onClick={() => removeStage(index)}><X aria-hidden="true" /></Button></div>
                </div>
                <div className="space-y-1"><label htmlFor={`approval-stage-kind-${stage.key}`} className="text-sm">단계 유형</label><select id={`approval-stage-kind-${stage.key}`} value={stage.kind} onChange={event => updateStage(stage.key, current => ({ ...current, kind: event.target.value as ApprovalStageRequest['kind'] }))} className="block w-full rounded-md border border-border bg-background p-2 text-sm"><option value="APPROVAL">결재 · 전원 승인</option><option value="AGREEMENT">합의 · 전원 동의</option></select></div>
                {stage.users.length > 0 ? <ul aria-label={`${index + 1}단계 결재자`} className="space-y-1">{stage.users.map(person => <li key={person.esntlId} className="flex items-center justify-between gap-2 text-sm"><span>{person.userNm || person.esntlId}{person.deptNm ? ` · ${person.deptNm}` : ''}</span><Button type="button" variant="ghost" size="sm" aria-label={`${person.userNm || person.esntlId} 결재선에서 제외`} onClick={() => updateStage(stage.key, current => ({ ...current, users: current.users.filter(item => item.esntlId !== person.esntlId) }))}>제외</Button></li>)}</ul> : <p className="text-sm text-muted-foreground">아직 결재자를 선택하지 않았습니다.</p>}
                <Button ref={node => { if (node) pickerButtons.current.set(stage.key, node); else pickerButtons.current.delete(stage.key); }} type="button" variant="outline" {...draftValidation.fieldProps(`stages.${index}.approverIds`)} aria-describedby={[draftValidation.fieldProps(`stages.${index}.approverIds`)['aria-describedby'], 'approval-stage-help'].filter(Boolean).join(' ')} aria-expanded={pickerStage === stage.key} disabled={pickerStage !== stage.key && (stage.users.length >= 10 || totalApprovers >= 50)} onClick={() => { setNotice(''); setPickerStage(current => current === stage.key ? null : stage.key); }}><UserRound aria-hidden="true" />{stage.users.length ? `${index + 1}단계 결재자 추가` : `${index + 1}단계 결재자 선택`}</Button>
                {pickerStage === stage.key && <ApproverInlinePicker
                  stageLabel={`${index + 1}단계`}
                  selectedIds={stage.users.map(person => person.esntlId ?? '')}
                  otherStageIds={stages.filter(other => other.key !== stage.key).flatMap(other => other.users.map(person => person.esntlId ?? ''))}
                  blockedReasons={new Map(refereeIds.map(id => [id, '참조자로 지정되어 있습니다']))}
                  selfId={user?.esntlId}
                  remaining={Math.min(10 - stage.users.length, 50 - totalApprovers)}
                  onToggle={(person, selected) => togglePerson(stage.key, index, person, selected)}
                  onClose={() => { const key = stage.key; setPickerStage(null); focusAfterRender(() => pickerButtons.current.get(key)); }}
                />}
                {fieldError(`stages.${index}.approverIds`)}
              </li>)}
            </ol>
            {fieldError('stages')}
            <Button type="button" variant="outline" disabled={stages.length >= 10 || totalApprovers >= 50} onClick={() => { touch(); const key = nextKey.current++; setStages(current => [...current, { key, kind: 'APPROVAL', users: [] }]); focusAfterRender(() => stageHeadings.current.get(key)); }}><Plus aria-hidden="true" /> 다음 단계 추가</Button>
            <p className="text-sm text-muted-foreground">{stages.length}/10단계 · {totalApprovers}/50명</p>
            {/* [2026-10-04 D4] 참조자 — 결재하지 않고 읽기만 하는 사람. 결재선 피커와 같은 펼친 피커를 쓰되, 결재 권한이 아니라 결재 조회
                권한·사용 중 여부로 고르고 결재선에 든 사람은 고를 수 없다. */}
            <section aria-labelledby="approval-referees-heading" className="space-y-3 rounded-md border border-border p-4">
              <h3 id="approval-referees-heading" className="font-semibold">참조자 (선택)</h3>
              <p id="approval-referee-help" className="text-sm text-muted-foreground">참조자는 결재하지 않고 문서를 읽기만 합니다. 지정하면 알림이 가고, 문서가 승인·반려·회수되어도 계속 읽을 수 있으며 지정은 되돌릴 수 없습니다. 결재 조회 권한이 있는 사용 중인 사람을 결재선과 겹치지 않게 한 문서에 {REFERENCE_LIMIT}명까지 지정할 수 있습니다.</p>
              <p className="text-sm text-muted-foreground">이번 차수에 참조자를 한 명이라도 지정하면 이 차수에는 결재자가 참조자를 더할 수 없습니다. 지정하지 않으면 지금 차례인 결재자가 더할 수 있습니다.</p>
              {template && !temporaryDraft && carriedRefereeCount > 0 && <p className="text-sm">복제한 문서의 참조자 {carriedRefereeCount}명을 가져왔습니다. 참조자는 상신할 때 다시 확인합니다.</p>}
              {referees.length > 0
                ? <ul aria-label="참조자" className="space-y-1">{referees.map(person => <li key={person.esntlId} className="flex items-center justify-between gap-2 text-sm"><span className="inline-flex flex-wrap items-center gap-1">{person.userNm || UNKNOWN_USER}{person.deptNm ? ` · ${person.deptNm}` : ''}<AbsenceBadge absent={person.absent} /></span><Button type="button" variant="ghost" size="sm" aria-label={`${person.userNm || UNKNOWN_USER} 참조자에서 제외`} onClick={() => toggleReferee(person, false)}>제외</Button></li>)}</ul>
                : <p className="text-sm text-muted-foreground">{resubmission ? '이번 차수에 지정할 참조자가 없습니다.' : '참조자를 지정하지 않았습니다.'}</p>}
              {earlierReferees.length > 0 && <div className="space-y-1 rounded-md border border-dashed border-border p-3 text-sm">
                <p>이번 차수에 지정하지 않았지만 이 문서를 계속 읽는 참조자입니다. 다시 지정하면 이번 차수의 최종 결과 알림도 받습니다.</p>
                <ul aria-label="계속 읽는 이전 참조자" className="space-y-1">{earlierReferees.map(person => <li key={person.userId} className="flex items-center justify-between gap-2"><span>{person.userNm || UNKNOWN_USER}{person.deptNm ? ` · ${person.deptNm}` : ''}{person.atrzCycl ? ` · ${person.atrzCycl}차 지정` : ''}</span><Button type="button" variant="ghost" size="sm" aria-label={`${person.userNm || UNKNOWN_USER} 이번 차수 참조자로 다시 지정`} disabled={lineIds.includes(person.userId ?? '')} onClick={() => toggleReferee({ esntlId: person.userId, userNm: person.userNm || UNKNOWN_USER, deptNm: person.deptNm ?? undefined }, true)}>다시 지정</Button></li>)}</ul>
              </div>}
              <Button ref={refereePickerButton} type="button" variant="outline" {...draftValidation.fieldProps('references')} aria-describedby={[draftValidation.fieldProps('references')['aria-describedby'], 'approval-referee-help'].filter(Boolean).join(' ')} aria-expanded={refereePickerOpen} disabled={!refereePickerOpen && refereeTotal >= REFERENCE_LIMIT} onClick={() => { setNotice(''); setRefereePickerOpen(current => !current); }}><UserPlus aria-hidden="true" />{referees.length ? '참조자 추가' : '참조자 선택'}</Button>
              {refereePickerOpen && <ApproverInlinePicker
                variant="reference"
                stageLabel="참조자"
                selectedIds={refereeIds}
                blockedReasons={new Map(lineIds.map(id => [id, '결재선에 있습니다'] as const))}
                selfId={user?.esntlId}
                remaining={REFERENCE_LIMIT - refereeTotal}
                uncountedIds={existingRefereeIds}
                onToggle={toggleReferee}
                onClose={() => { setRefereePickerOpen(false); focusAfterRender(() => refereePickerButton.current); }}
              />}
              <p className="text-sm text-muted-foreground">참조자 {refereeTotal}/{REFERENCE_LIMIT}명{earlierReferees.length > 0 ? ` · 이번 차수 ${referees.length}명` : ''}</p>
              {fieldError('references')}
            </section>
            <p role="status" aria-live="polite" className="text-sm text-foreground">{notice}</p>
          </>}
          {step === 2 && <>
            {blockedMessage && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-emphasis">{blockedMessage}</p>}
            {refereeBlockedMessage && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-emphasis">{refereeBlockedMessage}</p>}
            <dl className="space-y-3 rounded-md border border-border p-4"><div><dt className="text-sm text-muted-foreground">제목</dt><dd className="break-words font-semibold">{docTtl}</dd></div><div><dt className="text-sm text-muted-foreground">업무 구분</dt><dd>{taskOptions.find(code => code.dtlCd === taskSeCd)?.dtlCdNm || taskSeCd}</dd></div><div><dt className="text-sm text-muted-foreground">본문</dt><dd className="whitespace-pre-wrap break-words text-sm">{docCn || '작성한 본문이 없습니다.'}</dd></div><div><dt className="text-sm text-muted-foreground">신청일</dt><dd>{reqYmd.length === 8 ? `${reqYmd.slice(0, 4)}-${reqYmd.slice(4, 6)}-${reqYmd.slice(6, 8)}` : '신청일 미확인'}</dd></div></dl>
            <ol aria-label="상신 결재선 미리보기" className="space-y-2">{stages.map((stage, index) => <li key={stage.key} className="rounded-md border border-border p-3 text-sm"><p className="font-semibold">{index + 1}단계 · {stage.kind === 'AGREEMENT' ? '합의' : '결재'} · 전원 {stage.kind === 'AGREEMENT' ? '동의' : '승인'} ({stage.users.length}명)</p><p className="mt-1 flex flex-wrap items-center gap-1 break-words">{stage.users.map(person => <span key={person.esntlId} className="inline-flex items-center gap-1">{person.userNm || person.esntlId}<AbsenceBadge absent={absentById.get(person.esntlId)} /></span>)}</p></li>)}</ol>
            {[...absentById.values()].some(Boolean) && <p className="text-sm text-muted-foreground">부재 중인 결재자가 있습니다. 처리가 늦어질 수 있으며, 상신한 뒤에도 그 사람을 다른 결재자로 바꿀 수 있습니다.</p>}
            {refereeTotal > 0 && <section aria-label="상신 참조자 미리보기" className="space-y-1 rounded-md border border-border p-3 text-sm">
              <p className="font-semibold">참조자 · 읽기만 함 ({refereeTotal}명)</p>
              {referees.length > 0 && <p className="flex flex-wrap items-center gap-1 break-words">이번 차수 지정: {referees.map(person => <span key={person.esntlId} className="inline-flex items-center gap-1">{person.userNm || UNKNOWN_USER}<AbsenceBadge absent={person.absent} /></span>)}</p>}
              {earlierReferees.length > 0 && <p className="break-words text-muted-foreground">계속 읽는 이전 참조자: {earlierReferees.map(person => person.userNm || UNKNOWN_USER).join(', ')}</p>}
            </section>}
            {referees.length > 0 && <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">이번 차수에 지정한 참조자는 이 차수가 최종 승인·반려되면 알림을 받고, 이 문서에 처음 지정되는 사람은 상신할 때도 알림을 받습니다. 지정은 되돌릴 수 없으며, 참조자는 문서가 반려·회수되어도, 다음 차수에도 결재 의견과 처리 이력을 포함한 이 문서의 모든 내용을 계속 읽습니다.</p>}
            <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">각 단계의 전원이 승인해야 다음 단계가 시작됩니다. 누구든 한 명이 반려하면 문서 전체가 반려되어 남은 결재는 종료됩니다.</p>
          </>}
          <div className="space-y-2 border-t border-border pt-4">
            {canSaveTemporary && <div className="space-y-1 text-sm">
              {/* 저장 결과·불러온 결과를 알린다. role=status 는 결재선 단계의 안내가 쓰므로 여기서는 live region 만 둔다. */}
              <p aria-live="polite" className="text-foreground">{temporaryNotice}</p>
              {emptyStageCount > 0 && lineStarted && <p className="text-muted-foreground">결재자가 없는 단계는 임시저장하지 않습니다.</p>}
              {temporaryFull && <p className="text-muted-foreground">임시저장은 {TEMPORARY_DRAFT_LIMIT}건까지 둘 수 있습니다. 내용 작성 단계의 ‘임시저장한 기안’ 목록에서 쓰지 않는 임시저장을 지워야 새로 저장할 수 있습니다.</p>}
            </div>}
            <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" onClick={close}>취소</Button>{step > 0 && <Button type="button" variant="outline" onClick={goBack}>이전</Button>}{canSaveTemporary && <Button type="button" variant="outline" disabled={savingTemporary || submitting || temporaryConflict || temporaryFull} aria-busy={savingTemporary || undefined} onClick={() => { void handleSaveTemporary(); }}><Save aria-hidden="true" />{savingTemporary ? '기안 임시저장 중…' : '기안 임시저장'}</Button>}<Button type="submit" disabled={!hasTaskTypes || submitting || needsReview || (step === 2 && (Boolean(blockedMessage) || Boolean(refereeBlockedMessage) || temporaryConflict))} aria-busy={submitting || undefined}>{submitting ? '상신 중…' : step === 2 ? resubmission ? '새 차수로 재상신' : '결재 상신' : '다음'}</Button></div>
          </div>
        </fieldset>
      </form>
    </StandardModal>
  </>;
}
