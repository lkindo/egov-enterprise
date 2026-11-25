import { isSignedOut } from '@/lib/auth/authorization-state';
import { registerBeforeSignOut, registerOnSessionLost, rememberSignOutNotice } from '@/lib/auth/before-sign-out';

/**
 * 승인 되돌리기 대기열(2026-10-03 결재 동선 개선).
 *
 * <p>단건 승인은 확인 대화상자를 거치지 않는다. 대신 누른 뒤 일정 시간 동안 되돌릴 수 있고, 그 시간이 지나야
 * 서버에 보낸다. 반려는 되돌릴 수 없는 결과(문서 전체 종료)라 종전대로 확인을 거친다.
 *
 * <p>대기 중인 승인은 화면 상태가 아니라 이 모듈이 들고 있다 — 사용자가 다른 화면으로 옮겨 결재함이 사라져도
 * {@link flushApprovalCommits} 가 즉시 보내므로 누른 승인이 조용히 사라지지 않는다. 탭을 닫는 경우는 화면이
 * 이탈 확인으로 막는다(대기 중 승인이 있으면 미저장 변경으로 본다).
 */
export const APPROVAL_UNDO_MS = 10_000;


interface PendingCommit {
  timer: ReturnType<typeof setTimeout>;
  run: () => Promise<void>;
  onCancel?: () => void;
  label?: QueuedApprovalLabel;
}

/** 대기 중인 승인을 다른 화면이 말할 때 쓰는 이름 — 결재함과 알림 카드가 같은 대기열을 나눠 쓴다. */
export interface QueuedApprovalLabel {
  title: string;
  /** '승인' 또는 합의 단계의 '동의'. */
  actionNm: string;
}

export interface ScheduleApprovalOptions {
  delayMs?: number;
  /**
   * 보내기 전에 누가 취소했을 때 부른다. 대기열은 결재함과 알림 카드가 나눠 쓰므로, 올린 쪽이 아닌 화면이 되돌려도
   * 올린 쪽이 '되돌림' 을 알아야 한다(그러지 않으면 올린 쪽은 끝나지 않는 대기에 머문다).
   */
  onCancel?: () => void;
  label?: QueuedApprovalLabel;
}

const pending = new Map<number, PendingCommit>();
/** 이미 보낸(서버 응답을 기다리는) 승인. 로그아웃은 이것까지 기다린다 — 대기 목록에서는 보내는 순간 빠진다. */
const inFlight = new Set<Promise<void>>();
/** 로그아웃이 대기 승인을 보내는 동안 새 승인을 받지 않는다 — 시작한 정리의 대상에서 빠져 사라지지 않게. */
let closing = false;
const listeners = new Set<() => void>();
/** useSyncExternalStore 가 같은 값이면 같은 참조를 받아야 하므로 바뀔 때만 새 배열을 만든다. */
let snapshot: number[] = [];

function notify() {
  snapshot = [...pending.keys()];
  listeners.forEach((listener) => listener());
}

/** 대기 중인 문서 번호 목록이 바뀔 때마다 부른다. 돌려준 함수로 구독을 푼다. */
export function subscribeApprovalCommits(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function pendingApprovalCommits(): number[] {
  return snapshot;
}

/**
 * 같은 문서에 이미 대기 중인 승인이 있으면 새로 잡지 않고 false 를 돌려준다(연타 차단).
 * run 의 성공·실패 처리는 호출자가 run 안에서 한다 — 이 모듈은 언제 보낼지만 정한다.
 */
export function scheduleApprovalCommit(ifmlAtrzSn: number, run: () => Promise<void>,
  { delayMs = APPROVAL_UNDO_MS, onCancel, label }: ScheduleApprovalOptions = {}): boolean {
  // 로그아웃 중이거나 로그아웃한 뒤면 받지 않는다 — 보낼 수 없는 승인을 대기시키지 않는다.
  if (pending.has(ifmlAtrzSn) || closing || isSignedOut()) return false;
  const timer = setTimeout(() => { void commit(ifmlAtrzSn); }, delayMs);
  pending.set(ifmlAtrzSn, { timer, run, onCancel, label });
  notify();
  return true;
}

/** 대기 중인 승인을 올릴 때 받은 이름. 없거나 이름 없이 올렸으면 undefined. */
export function queuedApprovalLabel(ifmlAtrzSn: number): QueuedApprovalLabel | undefined {
  return pending.get(ifmlAtrzSn)?.label;
}

/** 아직 보내지 않았으면 취소하고 true(올린 쪽의 onCancel 을 부른다). 이미 보냈거나 없으면 false. */
export function cancelApprovalCommit(ifmlAtrzSn: number): boolean {
  const entry = pending.get(ifmlAtrzSn);
  if (!entry) return false;
  clearTimeout(entry.timer);
  pending.delete(ifmlAtrzSn);
  notify();
  entry.onCancel?.();
  return true;
}

async function commit(ifmlAtrzSn: number): Promise<void> {
  const entry = pending.get(ifmlAtrzSn);
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(ifmlAtrzSn);
  notify();
  const sending = entry.run();
  inFlight.add(sending);
  try {
    await sending;
  } finally {
    inFlight.delete(sending);
  }
}

/** 기다리지 않고 지금 보낸다(‘지금 처리’ 또는 화면을 떠날 때). */
export function commitApprovalNow(ifmlAtrzSn: number): Promise<void> {
  return commit(ifmlAtrzSn);
}

export function flushApprovalCommits(): Promise<void[]> {
  return Promise.all([...pending.keys()].map(commit));
}

/**
 * 로그아웃 직전 — 새 승인을 막고, 대기 중인 승인을 지금 보내고, 이미 보낸 승인의 응답까지 기다린다(2026-11-25 품질 평가). 종전에는
 * 로그아웃이 먼저 요청을 막아 승인을 누르고 10초 안에 로그아웃하면 그 승인이 조용히 사라졌고, 겹친 로그아웃은 보내는 중인 승인을
 * 추월했다.
 */
export async function settleApprovalCommitsForSignOut(): Promise<void> {
  closing = true;
  try {
    await flushApprovalCommits();
    await Promise.allSettled([...inFlight]);
  } finally {
    closing = false;
  }
}

/**
 * 세션이 이미 끝났을 때(다른 탭의 로그아웃·만료·로그아웃 대기 상한 초과) — 보낼 수 없는 대기 승인을 거두고, 다시 로그인할 때 볼 안내를
 * 남긴다. 이미 보낸 승인은 결과를 모른다고 알린다(서버가 반영했을 수 있다).
 */
export function abandonApprovalCommitsOnSessionLost(): void {
  const unsent = pending.size;
  const unconfirmed = inFlight.size;
  for (const entry of pending.values()) clearTimeout(entry.timer);
  pending.clear();
  notify();
  if (unsent > 0) {
    rememberSignOutNotice(`로그아웃되어 보내지 못한 승인이 ${unsent}건 있습니다. 결재함에서 다시 처리해 주세요.`);
  }
  if (unconfirmed > 0) {
    rememberSignOutNotice(`결과를 확인하지 못한 승인이 ${unconfirmed}건 있습니다. 결재함에서 처리 결과를 확인해 주세요.`);
  }
}

registerBeforeSignOut('approval-undo-queue', settleApprovalCommitsForSignOut);
registerOnSessionLost('approval-undo-queue', abandonApprovalCommitsOnSessionLost);
