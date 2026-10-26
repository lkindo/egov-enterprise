import { toDisplayYmd } from '@/lib/format-date';
import type { BoardMasterUpdateRequest } from '@/services/foundation/system/BoardAdminService';

/**
 * 게시판 설정 값의 화면 표기(ADR-0040 §5.5·결정 9). 설정 탭의 확인 표와 변경 이력 대화상자가 같은 표기를 쓴다.
 *
 * [2026-10-26 ADR-0043 1차 SET-08] 변경 이력은 서버가 저장값(Y/N·NONE/REQUIRED·바이트·yyyyMMdd)을 그대로 남긴다. 운영자가 읽기
 * 어려워 표시할 때만 설정 탭과 같은 말로 바꾸고, 바꿨으면 저장값을 보조로 함께 보인다 — 감사 기록 자체는 바꾸지 않는다. 이력 항목은
 * 서버가 남기는 항목명(BoardMasterService.SettingSnapshot, BoardService 의 게시 기간·상단 고정 항목)으로 찾고, 모르는 항목이나 어휘
 * 밖의 값은 저장값 그대로 보인다(추정해 바꾸지 않는다).
 */

export const BYTES_PER_MB = 1024 * 1024;

export type PrivatePostPolicy = NonNullable<BoardMasterUpdateRequest['prvtPstPlcyCd']>;

/** 비밀글 정책 세 값(ADR-0040 결정 7)의 짧은 이름 — 설정 확인 표가 쓴다. 어휘는 생성 스키마의 enum 이다. */
export const PRIVATE_POST_POLICY_LABELS: Readonly<Record<PrivatePostPolicy, string>> = {
  NONE: '없음',
  OPTIONAL: '선택',
  REQUIRED: '필수',
};

/** 값마다 무엇이 달라지는지 함께 말하는 이름 — 설정 탭의 선택 칸과 변경 이력이 쓴다. */
export const PRIVATE_POST_POLICY_OPTIONS: Readonly<Record<PrivatePostPolicy, string>> = {
  NONE: '없음(작성 화면에 선택 없음)',
  OPTIONAL: '선택(글쓴이가 고름)',
  REQUIRED: '필수(늘 비밀글로 저장)',
};

/** 값을 사람말로. 어휘 밖이면 null 이다 — 부르는 쪽이 저장값을 그대로 보인다. */
export type SettingValueText = (value: unknown) => string | null;

function numberOf(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const yesNo = (yes: string, no: string): SettingValueText => (value) => (value === 'Y' ? yes : value === 'N' ? no : null);
const count = (unit: string): SettingValueText => (value) => {
  const amount = numberOf(value);
  return amount === null ? null : `${amount.toLocaleString('ko-KR')}${unit}`;
};
const plain: SettingValueText = (value) => (value == null ? null : String(value));
const description: SettingValueText = (value) => (value == null || value === '' ? '없음' : String(value));
/** 0 이하·비어 있음은 게시판 상한 없음이다(서버 BoardPolicySupport#assertAttachmentPolicy). */
const fileQuantity: SettingValueText = (value) => {
  if (value == null || value === '') return '상한 없음';
  const quantity = numberOf(value);
  if (quantity === null) return null;
  return quantity <= 0 ? '상한 없음' : `${quantity.toLocaleString('ko-KR')}개`;
};
/** 0 이하·비어 있음은 서버 전역 상한이다(서버 BoardPolicySupport#assertNewFilesAllowed). 저장 단위는 바이트다. */
const fileSize: SettingValueText = (value) => {
  if (value == null || value === '') return '전역 상한';
  const bytes = numberOf(value);
  if (bytes === null) return null;
  return bytes <= 0 ? '전역 상한' : `${(bytes / BYTES_PER_MB).toLocaleString('ko-KR')}MB`;
};
const isPrivatePostPolicy = (value: unknown): value is PrivatePostPolicy =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(PRIVATE_POST_POLICY_OPTIONS, value);
const privatePolicyLabel: SettingValueText = (value) => (isPrivatePostPolicy(value) ? PRIVATE_POST_POLICY_LABELS[value] : null);
const privatePolicyOption: SettingValueText = (value) => (isPrivatePostPolicy(value) ? PRIVATE_POST_POLICY_OPTIONS[value] : null);
/** 저장 날짜(yyyyMMdd·yyyy-MM-dd)를 화면 날짜로. 손상 값이면 null — 저장값 그대로 보인다. */
const ymd: SettingValueText = (value) => (value == null || value === '' ? null : toDisplayYmd(String(value), '') || null);

const received = yesNo('받음', '받지 않음');
const allowed = yesNo('허용', '허용 안 함');

/** 설정 탭 칸마다의 표기(확인 표의 현재·변경 후 값). 비밀글 정책은 짧은 이름이다 — 영향 칸이 뜻을 말한다. */
export const BOARD_SETTING_TEXT = {
  bbsTtl: plain,
  bbsExpln: description,
  useYn: yesNo('사용', '사용 안 함'),
  ansYn: received,
  stsfdgYn: received,
  fileAtchPsbltyYn: allowed,
  atchPsbltyFileQty: fileQuantity,
  atchPsbltyFileSz: fileSize,
  rsvtPstgPsbltyYn: received,
  upendFixPsbltyYn: allowed,
  upendFixUplmtNocs: count('건'),
  upendFixBscDayCnt: count('일'),
  prvtPstPlcyCd: privatePolicyLabel,
  rcmdtnUseYn: received,
} as const satisfies Readonly<Record<string, SettingValueText>>;

/**
 * 변경 이력 항목명 → 화면 이름·표기. 항목명은 서버가 남기는 이름 그대로다. '파일당 크기(바이트)' 는 MB 로 보이므로 화면 이름에서
 * 단위를 뗀다. 비밀글 정책은 선택 칸과 같은 이름(예: '필수(늘 비밀글로 저장)')이다 — 이력에는 영향 칸이 없다.
 */
const BOARD_CHANGE_ITEMS: Readonly<Record<string, { label: string; text: SettingValueText }>> = {
  '게시판 명칭': { label: '게시판 명칭', text: BOARD_SETTING_TEXT.bbsTtl },
  '게시판 소개': { label: '게시판 소개', text: BOARD_SETTING_TEXT.bbsExpln },
  '게시판 사용': { label: '게시판 사용', text: BOARD_SETTING_TEXT.useYn },
  '답글 허용': { label: '답글 허용', text: allowed },
  '댓글 받기': { label: '댓글 받기', text: BOARD_SETTING_TEXT.ansYn },
  '만족도 평가 받기': { label: '만족도 평가 받기', text: BOARD_SETTING_TEXT.stsfdgYn },
  '파일 첨부 허용': { label: '파일 첨부 허용', text: BOARD_SETTING_TEXT.fileAtchPsbltyYn },
  '첨부 파일 수': { label: '첨부 파일 수', text: BOARD_SETTING_TEXT.atchPsbltyFileQty },
  '파일당 크기(바이트)': { label: '파일당 크기', text: BOARD_SETTING_TEXT.atchPsbltyFileSz },
  '예약 게시': { label: '예약 게시', text: BOARD_SETTING_TEXT.rsvtPstgPsbltyYn },
  '상단 고정 허용': { label: '상단 고정 허용', text: BOARD_SETTING_TEXT.upendFixPsbltyYn },
  '상단 고정 상한': { label: '상단 고정 상한', text: BOARD_SETTING_TEXT.upendFixUplmtNocs },
  '상단 고정 기본 일수': { label: '상단 고정 기본 일수', text: BOARD_SETTING_TEXT.upendFixBscDayCnt },
  '비밀글 정책': { label: '비밀글 정책', text: privatePolicyOption },
  '추천 받기': { label: '추천 받기', text: BOARD_SETTING_TEXT.rcmdtnUseYn },
  // 게시글 행(운영 화면의 게시 기간·상단 고정 처리)
  '게시 시작일': { label: '게시 시작일', text: ymd },
  '게시 종료일': { label: '게시 종료일', text: ymd },
  '상단 고정': { label: '상단 고정', text: yesNo('고정', '고정 안 함') },
  '상단 고정 종료일': { label: '상단 고정 종료일', text: ymd },
};

export interface BoardChangeValues {
  /** 항목의 화면 이름. 모르는 항목은 서버가 남긴 이름 그대로다. */
  label: string;
  before: string;
  after: string;
  /** 표시를 사람말로 바꿨으면 저장값('Y → N' 꼴). 바꾼 것이 없으면 null 이다. */
  stored: string | null;
}

const EMPTY = '—';
const storedText = (value: string | null | undefined): string => (value == null || value === '' ? EMPTY : value);

/** 변경 이력 한 행의 표시. 값이 없으면 '—' 이고, 비어 있음이 뜻을 갖는 항목(첨부 수·크기·소개)은 그 뜻으로 보인다. */
export function describeBoardChange(item: string, before?: string | null, after?: string | null): BoardChangeValues {
  const storedBefore = storedText(before);
  const storedAfter = storedText(after);
  const entry = Object.prototype.hasOwnProperty.call(BOARD_CHANGE_ITEMS, item) ? BOARD_CHANGE_ITEMS[item] : undefined;
  if (!entry) return { label: item, before: storedBefore, after: storedAfter, stored: null };
  const shownBefore = entry.text(before ?? null) || storedBefore;
  const shownAfter = entry.text(after ?? null) || storedAfter;
  const changed = shownBefore !== storedBefore || shownAfter !== storedAfter;
  return {
    label: entry.label,
    before: shownBefore,
    after: shownAfter,
    stored: changed ? `${storedBefore} → ${storedAfter}` : null,
  };
}
