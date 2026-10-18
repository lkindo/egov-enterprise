import {
  SANCTION_STATUS,
  type InformalSanctionDto,
  type SanctionStatusCode,
} from '@/services/business/user/approval/ApprovalUserService';
import type { ApprovalTab } from '@/queries/approval-query-options';
import { getTodayYmd } from '@/lib/date/today-ymd';

/*
 * 결재 허브의 상수와 순수 판정(2026-10-18 허브 분해 때 ApprovalHubClient 에서 옮겼다 — 값·문구·판정 그대로).
 * 탭 이름(TAB_LABELS)과 결재 의견 스키마는 계약이 허브 파일에서 읽으므로 허브에 남는다.
 */

export const EMPTY_APPROVALS: InformalSanctionDto[] = [];
export const NO_QUEUED: number[] = [];

/**
 * 마스터 목록 페이지 크기.
 *
 * [2026-09-05] 종전에는 `{ page: 0, size: 50 }` 한 페이지만 받고 페이저가 없어 51번째 문서부터
 * 화면에서 도달할 수 없었다. 페이지 상태는 URL 에 싣지 않는다(승인된 URL-state 부류가 아니다).
 */
export const PAGE_SIZE = 20;

/** 문서 상태 조건(2026-09-26 DIP B5 F4) — 대기 탭에서는 쓰지 않는다. */
export const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: '' | SanctionStatusCode; label: string }> = [
  { value: '', label: '전체 상태' },
  { value: 'A', label: '대기 중' },
  { value: 'C', label: '승인 완료' },
  { value: 'R', label: '반려' },
  { value: 'W', label: '회수' },
];

/** 탭이 고르는 대기열 패널(하나)과 탭 id. */
export const APPROVAL_QUEUE_PANEL_ID = 'approval-queue-panel';
export const approvalTabId = (tab: ApprovalTab) => `approval-tab-${tab}`;

export const EMPTY_MESSAGES: Record<ApprovalTab, string> = {
  PENDING: '대기 중인 결재가 없습니다.',
  SUBMITTED: '올린 결재가 없습니다. 오른쪽 위 \'새 결재 기안\' 으로 상신할 수 있습니다.',
  PROCESSED: '승인하거나 반려한 결재가 없습니다.',
  REFERENCED: '참조된 결재가 없습니다. 다른 사람이 나를 참조자로 지정하면 여기에서 읽을 수 있습니다.',
};

/** 진행 중인 처리 — 반려·승인 상태 코드, 회수, 보완 요청, 여러 건 승인, 고쳐서 다시 올리기. */
export type ApprovalPendingAction = SanctionStatusCode | 'CANCEL' | 'ASK' | 'BULK' | 'REVISE';

/**
 * 알림이 여는 주소(2026-10-03 D1). 탭과 문서 번호만 읽고 그 밖의 값은 버린다. 이 화면이 URL 에 쓰는 것은 연 링크를
 * 지우는 일뿐이다(링크 효과 참고) — 상태 값은 싣지 않는다. 탭 해석(linkedTab)은 approval-tabs.ts 에 있다.
 */
export function linkedDocument(value: string | null): string | null {
  return value && /^[1-9]\d{0,17}$/.test(value) ? value : null;
}

/** YYYYMMDD 8자리 저장 형식을 사람이 읽는 날짜로. 형식이 다르면 원문을 그대로 보여준다. */
export function formatYmd(value?: string): string {
  if (!value) return '-';
  return /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
}

/** 목록·상세·ref 키로 쓰는 문서 식별자. 서버 타입이 optional 이라 문자열로 정규화한다. */
export function sanctionKey(item: InformalSanctionDto): string {
  return String(item.ifmlAtrzSn ?? '');
}

/**
 * 서버 일시의 한국 날짜(yyyyMMdd). 시간대 표기가 없는 값은 서버 시각(Asia/Seoul) 그대로이므로 날짜 부분을 읽는다.
 * 브라우저 시간대로 해석하지 않는다 — 해외·UTC 환경에서 날짜가 하루 밀린다.
 */
function seoulYmd(value: string): string | null {
  if (/T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : getTodayYmd(new Date(time));
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[1]}${match[2]}${match[3]}` : null;
}

/** 두 yyyyMMdd 사이의 달력 날 수. */
function calendarDaysBetween(from: string, to: string): number {
  const utc = (ymd: string) => Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/**
 * 지금 차례인 사람과 그 단계가 시작된 뒤 지난 날(진행 중인 문서만).
 *
 * [2026-10-03] '오늘 차례가 됨' 은 한국 달력 날짜로 판정한다 — 재알림의 '하루' 와 같은 기준이다. 종전에는 경과
 * 24시간으로 세어 어제 저녁 차례가 된 문서를 오늘 아침에도 '오늘' 이라고 했다.
 */
export function currentTurn(item: InformalSanctionDto, now: number) {
  if (item.aprvYn !== SANCTION_STATUS.REQUESTED) return null;
  const stage = item.stages?.find(entry => entry.status === 'ACTIVE');
  const waiting = (stage?.approvers ?? []).filter(person => person.status === 'ACTIVE');
  const since = item.currentStageSince ? seoulYmd(item.currentStageSince) : null;
  const days = since === null ? null : Math.max(0, calendarDaysBetween(since, getTodayYmd(new Date(now))));
  return { waiting, days };
}

/**
 * 보는 사람이 이 문서의 보이는 결재선에 있는가(차례가 온 사람·아직 차례 전인 사람 모두). 이전 차수 참조자가 이 차수 결재자가 되면
 * 서버는 referenceViewer 를 참으로 주지만, 그 사람에게 문서는 '참조로 받은 읽기 전용' 이 아니라 결재할 문서다(D4 개정 1).
 */
function onVisibleLine(item: InformalSanctionDto, esntlId: string | undefined): boolean {
  if (!esntlId) return false;
  return (item.stages ?? []).some(stage => (stage.approvers ?? []).some(person => person.userId === esntlId));
}

/**
 * 참조로 받은 읽기 전용 문서인가 — 서버 판정(referenceViewer)으로만 본다. 이전 차수 참조자가 이 차수 결재자가 되면 처리할
 * 차례가 있는 문서이므로 참조로 부르지 않는다(처리 힌트가 있거나 보이는 결재선에 있으면 결재 문서다). 목록 배지와 상세 안내가
 * 같은 판정을 쓴다.
 */
export function isReadOnlyReference(item: InformalSanctionDto, esntlId: string | undefined): boolean {
  return Boolean(item.referenceViewer) && !item.canApprove && !item.canRequestSupplement && !onVisibleLine(item, esntlId);
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** 화면 위에 대화상자(기안·확인·사람 고르기·명령 센터)가 열려 있는가. Radix 는 키 이벤트의 전파를 막지 않는다. */
export function hasOpenDialog(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]') !== null;
}

/** 되돌리기 대기열에 오른 승인 — 배너가 부를 문서 이름과, 되돌리거나 실패했을 때 되살릴 의견을 문서별로 둔다. */
export interface QueuedApproval {
  title: string;
  actionNm: string;
  item: InformalSanctionDto;
  reason?: string;
}
