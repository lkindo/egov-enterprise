import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APPROVAL_UNDO_MS,
  cancelApprovalCommit,
  commitApprovalNow,
  flushApprovalCommits,
  pendingApprovalCommits,
  scheduleApprovalCommit,
  subscribeApprovalCommits,
} from '../approval-undo-queue';

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
});
