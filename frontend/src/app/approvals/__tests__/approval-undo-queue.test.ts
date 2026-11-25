import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APPROVAL_UNDO_MS,
  cancelApprovalCommit,
  commitApprovalNow,
  flushApprovalCommits,
  pendingApprovalCommits,
  queuedApprovalLabel,
  scheduleApprovalCommit,
  subscribeApprovalCommits,
} from '../approval-undo-queue';
import { runBeforeSignOut, runOnSessionLost, takeSignOutNotices } from '@/lib/auth/before-sign-out';
import { markSignedIn, markSignedOut } from '@/lib/auth/authorization-state';

/** 승인 되돌리기 대기열 — 언제 보내는지만 정하고, 누른 승인이 조용히 사라지지 않게 한다. */
describe('approval-undo-queue', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(async () => {
    await flushApprovalCommits();
    vi.useRealTimers();
  });

  it('정해진 시간이 지나야 보내고, 그 전에는 대기 목록에 남는다', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    expect(scheduleApprovalCommit(1, run)).toBe(true);
    expect(pendingApprovalCommits()).toEqual([1]);

    await vi.advanceTimersByTimeAsync(APPROVAL_UNDO_MS - 1);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(pendingApprovalCommits()).toEqual([]);
  });

  it('[2026-11-25] 로그아웃 직전에 대기 중인 승인을 보낸다 — 로그아웃이 요청을 막기 전에 끝난다', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    scheduleApprovalCommit(7, run);

    await runBeforeSignOut();

    expect(run).toHaveBeenCalledTimes(1);
    expect(pendingApprovalCommits()).toEqual([]);
  });

  it('[Codex 검토] 로그아웃은 이미 보낸 승인의 응답까지 기다리고, 그동안 새 승인을 받지 않는다', async () => {
    let answer: () => void = () => {};
    const slow = vi.fn(() => new Promise<void>((resolve) => { answer = resolve; }));
    scheduleApprovalCommit(8, slow);
    void commitApprovalNow(8); // '지금 처리' — 대기 목록에서는 빠졌지만 응답 전이다.

    let settled = false;
    const signingOut = runBeforeSignOut().then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(0);
    expect(scheduleApprovalCommit(9, vi.fn())).toBe(false);
    expect(settled).toBe(false);

    answer();
    await signingOut;
    expect(settled).toBe(true);
    expect(scheduleApprovalCommit(10, vi.fn().mockResolvedValue(undefined))).toBe(true);
  });

  it('[Codex 검토] 로그아웃한 뒤에는 승인을 대기시키지 않는다', () => {
    markSignedOut();
    try {
      expect(scheduleApprovalCommit(11, vi.fn())).toBe(false);
    } finally {
      markSignedIn();
    }
  });

  it('[Codex 검토] 세션을 이미 잃었으면 대기 승인을 보내지 않고 거두며, 다시 로그인할 때 볼 안내를 남긴다', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    scheduleApprovalCommit(12, run);
    scheduleApprovalCommit(13, run);

    runOnSessionLost();

    expect(pendingApprovalCommits()).toEqual([]);
    await vi.advanceTimersByTimeAsync(APPROVAL_UNDO_MS);
    expect(run).not.toHaveBeenCalled();
    expect(takeSignOutNotices()).toEqual(['로그아웃되어 보내지 못한 승인이 2건 있습니다. 결재함에서 다시 처리해 주세요.']);
  });

  it('같은 문서를 다시 잡지 않는다 — 연타가 두 번 보내지 않는다', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    expect(scheduleApprovalCommit(2, run)).toBe(true);
    expect(scheduleApprovalCommit(2, run)).toBe(false);
    await vi.advanceTimersByTimeAsync(APPROVAL_UNDO_MS);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('되돌리면 보내지 않고, 이미 보낸 뒤에는 되돌릴 수 없다', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    scheduleApprovalCommit(3, run);
    expect(cancelApprovalCommit(3)).toBe(true);
    await vi.advanceTimersByTimeAsync(APPROVAL_UNDO_MS);
    expect(run).not.toHaveBeenCalled();

    scheduleApprovalCommit(4, run);
    await commitApprovalNow(4);
    expect(run).toHaveBeenCalledTimes(1);
    expect(cancelApprovalCommit(4)).toBe(false);
  });

  it('화면을 떠날 때는 기다리지 않고 남은 것을 모두 보낸다', async () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const second = vi.fn().mockResolvedValue(undefined);
    scheduleApprovalCommit(5, first);
    scheduleApprovalCommit(6, second);
    await flushApprovalCommits();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(pendingApprovalCommits()).toEqual([]);
  });

  it('바뀔 때만 알리고 같은 상태에서는 같은 목록 참조를 준다', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeApprovalCommits(listener);
    const before = pendingApprovalCommits();
    expect(pendingApprovalCommits()).toBe(before);
    scheduleApprovalCommit(7, vi.fn().mockResolvedValue(undefined));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(pendingApprovalCommits()).not.toBe(before);
    unsubscribe();
    cancelApprovalCommit(7);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('누가 취소하든 올린 쪽의 onCancel 을 한 번 부르고, 보냈으면 부르지 않는다 — 결재함과 알림 카드가 같은 대기열을 나눠 쓴다', async () => {
    const onCancel = vi.fn();
    const run = vi.fn().mockResolvedValue(undefined);
    scheduleApprovalCommit(8, run, { onCancel, label: { title: '출장', actionNm: '동의' } });
    expect(queuedApprovalLabel(8)).toEqual({ title: '출장', actionNm: '동의' });
    // 다른 화면(결재함의 '처리 예정')이 같은 번호로 되돌린다.
    expect(cancelApprovalCommit(8)).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(cancelApprovalCommit(8)).toBe(false);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(queuedApprovalLabel(8)).toBeUndefined();

    const sentCancel = vi.fn();
    scheduleApprovalCommit(9, run, { onCancel: sentCancel });
    await vi.advanceTimersByTimeAsync(APPROVAL_UNDO_MS);
    expect(run).toHaveBeenCalledTimes(1);
    expect(cancelApprovalCommit(9)).toBe(false);
    expect(sentCancel).not.toHaveBeenCalled();
  });
});
