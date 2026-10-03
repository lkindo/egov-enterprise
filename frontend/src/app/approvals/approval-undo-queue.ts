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
}

const pending = new Map<number, PendingCommit>();
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
export function scheduleApprovalCommit(ifmlAtrzSn: number, run: () => Promise<void>, delayMs = APPROVAL_UNDO_MS): boolean {
  if (pending.has(ifmlAtrzSn)) return false;
  const timer = setTimeout(() => { void commit(ifmlAtrzSn); }, delayMs);
  pending.set(ifmlAtrzSn, { timer, run });
  notify();
  return true;
}

/** 아직 보내지 않았으면 취소하고 true. 이미 보냈거나 없으면 false. */
export function cancelApprovalCommit(ifmlAtrzSn: number): boolean {
  const entry = pending.get(ifmlAtrzSn);
  if (!entry) return false;
  clearTimeout(entry.timer);
  pending.delete(ifmlAtrzSn);
  notify();
  return true;
}

async function commit(ifmlAtrzSn: number): Promise<void> {
  const entry = pending.get(ifmlAtrzSn);
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(ifmlAtrzSn);
  notify();
  await entry.run();
}

/** 기다리지 않고 지금 보낸다(‘지금 처리’ 또는 화면을 떠날 때). */
export function commitApprovalNow(ifmlAtrzSn: number): Promise<void> {
  return commit(ifmlAtrzSn);
}

export function flushApprovalCommits(): Promise<void[]> {
  return Promise.all([...pending.keys()].map(commit));
}
