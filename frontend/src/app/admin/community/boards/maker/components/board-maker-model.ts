import * as z from 'zod';
import {
  Book,
  BookOpen,
  CalendarDays,
  HelpCircle,
  ImageIcon,
  List,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import type { BoardMasterSummary } from '@/services/foundation/system/BoardAdminService';
import { BOARD_TYPES, boardTemplateName, type BoardTemplateId } from '@/lib/board/board-types';
import { BoardMasterDtoSchema } from '@/types/generated-zod';

/** 게시판 관리 목록 — '만들기 취소'와 결과 화면의 목록 이동이 간다. */
export const BOARD_MASTER_LIST_ROUTE = '/admin/community/boards/master';

/**
 * [2026-10-26 ADR-0043] 마법사의 요청은 실패를 화면 안(오류 상자)에서 사유와 함께 보인다 — 같은 실패를 전역 토스트로 한 번 더 띄우지
 * 않는다(DEC-OPS-184 실패 한 번에 알림 하나).
 */
export const QUIET = { suppressErrorToast: true } as const;

/** 생성 응답을 받지 못했을 때 '방금 만든 게시판'으로 볼 만든 시각의 범위(서버·브라우저 시계 차이를 함께 품는다). */
export const RECOVERY_WINDOW_MS = 10 * 60 * 1000;

/** 비밀글 정책 세 값(ADR-0040 결정 7). 어휘는 생성 스키마의 enum 이다. */
export type PrivatePostPolicy = NonNullable<z.infer<typeof BoardMasterDtoSchema>['prvtPstPlcyCd']>;

/** 비밀글 정책 선택 항목 — 값마다 무엇이 달라지는지 함께 말한다(운영 화면 설정 탭과 같은 말). */
export const PRIVATE_POST_POLICY_OPTIONS: Readonly<Record<PrivatePostPolicy, string>> = {
  NONE: '없음(작성 화면에 선택 없음)',
  OPTIONAL: '선택(글쓴이가 고름)',
  REQUIRED: '필수(늘 비밀글로 저장)',
};

export const PRIVATE_POST_POLICY_SUMMARY: Readonly<Record<PrivatePostPolicy, string>> = {
  NONE: '없음',
  OPTIONAL: '선택',
  REQUIRED: '필수',
};

/**
 * 용도 프리셋(설계서 §5.3 표). 용도는 사용자가 아직 직접 바꾸지 않은 칸만 채운다. 파일당 크기는 용도와 무관하게 비워 둔다(전역 상한).
 */
export const BOARD_PURPOSES = [
  { id: 'NOTICE', label: '공지형', tmpltId: 'TMPLT_LIST', ansYn: 'N', stsfdgYn: 'N', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, rsvtPstgPsbltyYn: 'Y',
    upendFixPsbltyYn: 'Y', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30, prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'N' },
  { id: 'ARCHIVE', label: '자료실형', tmpltId: 'TMPLT_LIST', ansYn: 'Y', stsfdgYn: 'Y', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 10, rsvtPstgPsbltyYn: 'N',
    upendFixPsbltyYn: 'N', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30, prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'Y' },
  { id: 'FREE', label: '자유형', tmpltId: 'TMPLT_LIST', ansYn: 'Y', stsfdgYn: 'N', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, rsvtPstgPsbltyYn: 'N',
    upendFixPsbltyYn: 'N', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30, prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'Y' },
  { id: 'QNA', label: '질의응답형', tmpltId: 'TMPLT_QNA', ansYn: 'Y', stsfdgYn: 'Y', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, rsvtPstgPsbltyYn: 'N',
    upendFixPsbltyYn: 'N', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30, prvtPstPlcyCd: 'OPTIONAL', rcmdtnUseYn: 'Y' },
] as const satisfies readonly {
  id: string; label: string; tmpltId: BoardTemplateId; ansYn: 'Y' | 'N'; stsfdgYn: 'Y' | 'N'; fileAtchPsbltyYn: 'Y' | 'N'; atchPsbltyFileQty: number;
  rsvtPstgPsbltyYn: 'Y' | 'N'; upendFixPsbltyYn: 'Y' | 'N'; upendFixUplmtNocs: number; upendFixBscDayCnt: number;
  prvtPstPlcyCd: PrivatePostPolicy; rcmdtnUseYn: 'Y' | 'N';
}[];

export type BoardPurpose = (typeof BOARD_PURPOSES)[number];
export type PurposeField = 'tmpltId' | 'ansYn' | 'stsfdgYn' | 'fileAtchPsbltyYn' | 'atchPsbltyFileQty' | 'rsvtPstgPsbltyYn'
  | 'upendFixPsbltyYn' | 'upendFixUplmtNocs' | 'upendFixBscDayCnt' | 'prvtPstPlcyCd' | 'rcmdtnUseYn';

/**
 * [2026-10-26 ADR-0043 WIZ-10] 용도가 채우는 칸과 그 화면 이름. 순서는 2단계 화면의 순서다.
 */
export const PURPOSE_FIELD_LABELS: ReadonlyArray<readonly [PurposeField, string]> = [
  ['tmpltId', '화면 유형'],
  ['ansYn', '댓글 받기'],
  ['stsfdgYn', '만족도 평가 받기'],
  ['fileAtchPsbltyYn', '파일 첨부 허용'],
  ['rsvtPstgPsbltyYn', '예약 게시 받기'],
  ['upendFixPsbltyYn', '상단 고정 받기'],
  ['rcmdtnUseYn', '추천 받기'],
  ['atchPsbltyFileQty', '첨부 파일 수'],
  ['upendFixUplmtNocs', '상단 고정 상한'],
  ['upendFixBscDayCnt', '상단 고정 기본 일수'],
  ['prvtPstPlcyCd', '비밀글 정책'],
];

export const BYTES_PER_MB = 1024 * 1024;

const TEMPLATE_PRESENTATION = {
  TMPLT_HUB: { icon: BookOpen, color: 'bg-primary text-primary-foreground' },
  TMPLT_LIST: { icon: List, color: 'bg-success text-success-foreground' },
  TMPLT_GALLERY: { icon: ImageIcon, color: 'bg-destructive text-destructive-foreground' },
  TMPLT_QNA: { icon: HelpCircle, color: 'bg-warning text-warning-foreground' },
  TMPLT_CALENDAR: { icon: CalendarDays, color: 'bg-info text-info-foreground' },
  TMPLT_FAQ: { icon: MessageSquare, color: 'bg-primary text-primary-foreground' },
  TMPLT_WIKI: { icon: Book, color: 'bg-surface-inverse text-surface-inverse-foreground' },
} satisfies Record<BoardTemplateId, { icon: LucideIcon; color: string }>;

export const TEMPLATES = BOARD_TYPES.map((type) => ({
  id: type.templateId,
  name: type.name,
  description: type.description,
  typeCode: type.code,
  ...TEMPLATE_PRESENTATION[type.templateId],
}));

export const templateName = (templateId: string | undefined) => boardTemplateName(templateId);
export const yesNo = (value: string | undefined, yes = '받음', no = '받지 않음') => (value === 'N' ? no : yes);

/** [WIZ-10] 용도가 무엇을 채우는지 한 줄로 — 프리셋 값에서 만들어 표와 갈리지 않는다. */
export function describePurpose(preset: BoardPurpose): string {
  return [
    `화면 유형 ${templateName(preset.tmpltId)}`,
    `댓글 ${yesNo(preset.ansYn)}`,
    `만족도 ${yesNo(preset.stsfdgYn)}`,
    `추천 ${yesNo(preset.rcmdtnUseYn)}`,
    `첨부 ${preset.fileAtchPsbltyYn === 'Y' ? `${preset.atchPsbltyFileQty}개` : '허용 안 함'}`,
    `예약 게시 ${yesNo(preset.rsvtPstgPsbltyYn)}`,
    `상단 고정 ${preset.upendFixPsbltyYn === 'Y' ? `허용(${preset.upendFixUplmtNocs}건·${preset.upendFixBscDayCnt}일)` : '허용 안 함'}`,
    `비밀글 ${PRIVATE_POST_POLICY_SUMMARY[preset.prvtPstPlcyCd]}`,
  ].join(' · ');
}

export const BOARD_MAKER_FORM_LABELS: Record<string, string> = {
  bbsTtl: '게시판 명칭',
  bbsExpln: '게시판 소개',
  tmpltId: '화면 유형',
  atchPsbltyFileQty: '첨부 파일 수',
  atchPsbltyFileSz: '파일당 크기',
  rsvtPstgPsbltyYn: '예약 게시',
  upendFixPsbltyYn: '상단 고정 허용',
  upendFixUplmtNocs: '상단 고정 상한',
  upendFixBscDayCnt: '상단 고정 기본 일수',
  prvtPstPlcyCd: '비밀글 정책',
  rcmdtnUseYn: '추천 받기',
  cmntySn: '커뮤니티 귀속',
  'root.server': '저장 오류',
};

export const BOARD_MAKER_FIELD_STEPS: Record<string, number> = {
  bbsTtl: 1,
  bbsExpln: 1,
  cmntySn: 1,
  tmpltId: 2,
  atchPsbltyFileQty: 2,
  atchPsbltyFileSz: 2,
  rsvtPstgPsbltyYn: 2,
  upendFixPsbltyYn: 2,
  upendFixUplmtNocs: 2,
  upendFixBscDayCnt: 2,
  prvtPstPlcyCd: 2,
  rcmdtnUseYn: 2,
};

/** 만든 게시판(결과 화면의 대상). communityBound 는 커뮤니티 귀속 여부다 — 입구가 커뮤니티 화면이라 메뉴 안내를 건너뛴다(결정 1). */
export interface CreatedBoard {
  bbsId: string;
  bbsTtl: string;
  communityBound: boolean;
  inUse: boolean;
}

/**
 * [2026-10-26 WIZ-15] 생성 응답을 받지 못했을 때 같은 이름으로 방금 만든 게시판을 찾은 결과.
 */
export type Recovery =
  | { status: 'searching' }
  | { status: 'found'; board: BoardMasterSummary }
  | { status: 'none' }
  | { status: 'failed' }
  | { status: 'unavailable' };

/** 응답의 HTTP 상태. 응답이 없으면(연결 끊김·시간 초과) null 이다. */
export function responseStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : null;
}

/** 쓰기 결과를 모르는가 — 응답이 없거나 서버 오류(5xx)면 서버에 반영됐을 수 있다. 4xx 는 확정 결과다. */
export function writeOutcomeUnknown(error: unknown): boolean {
  const status = responseStatus(error);
  return status === null || status >= 500;
}

/** 목록 응답의 만든 시각(시간대 표기 없는 서버 현지 시각 = Asia/Seoul)을 epoch 밀리초로. 해석할 수 없으면 null. */
function seoulEpoch(value: string | null | undefined): number | null {
  const raw = value?.trim();
  if (!raw) return null;
  const iso = raw.replace(' ', 'T');
  const time = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}+09:00`);
  return Number.isNaN(time) ? null : time;
}

/** 만든 시각 표시('yyyy-MM-dd HH:mm:ss'). 서버 현지 시각 문자열을 그대로 자른다. */
export function displayCreatedAt(value: string | null | undefined): string {
  const match = value?.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : '알 수 없음';
}

/**
 * 방금 만든 것으로 볼 게시판 — 이름·화면 유형이 같고, 사용 안 함이며, 만든 시각이 지금에서 RECOVERY_WINDOW_MS 안이다.
 */
export function findJustCreatedBoard(
  list: readonly BoardMasterSummary[],
  draft: { bbsTtl: string; tmpltId: string; cmntySn?: number | null },
  now: number = Date.now(),
): BoardMasterSummary | null {
  return list.find((board) => {
    if (board.bbsTtl !== draft.bbsTtl || board.tmpltId !== draft.tmpltId || board.useYn !== 'N') return false;
    if ((board.community?.cmntySn ?? null) !== (draft.cmntySn ?? null)) return false;
    const createdAt = seoulEpoch(board.crtDt);
    return createdAt !== null && Math.abs(now - createdAt) <= RECOVERY_WINDOW_MS;
  }) ?? null;
}
