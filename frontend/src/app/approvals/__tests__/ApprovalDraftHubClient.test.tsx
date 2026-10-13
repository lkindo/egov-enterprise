import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 결재 기안 화면(/approvals/draft) 계약 — 2026-10-13 DEC-OPS-302.
 *
 * 2026-09-16 부터 이 화면은 목업이 아니라 결재함(/approvals)과 같은 기안 창(ApprovalDraftDialog)을 연다. 기안 권한이 있으면
 * 들어오자마자 창이 열리고, 상신하면 결재함으로 간다. 권한이 없으면 창과 '기안 작성' 단추 대신 사유를 말한다.
 * 라우트 원장의 draft.compose(E3)는 이 시험을 증거로 든다.
 *
 * 기안 창 자체(업무 구분·결재선·임시저장·상신)는 ApprovalDraftDialog.test.tsx 가 본다 — 여기서는 창을 대역으로 바꾸고
 * 이 화면이 창을 언제 열고, 상신한 뒤 어디로 보내는지만 본다.
 */
const router = vi.hoisted(() => ({ push: vi.fn() }));
const auth = vi.hoisted(() => ({ user: { esntlId: 'DRAFTER', authorizationVersion: 'test-v1', permissions: ['APPROVAL_CREATE'] as string[] } }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('../ApprovalDraftDialog', () => ({
  ApprovalDraftDialog: ({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) => (
    <div role="dialog" aria-label="새 결재 기안">
      <button type="button" onClick={onClose}>닫기</button>
      <button type="button" onClick={() => onCreated(7)}>상신 완료</button>
    </div>
  ),
}));

import ApprovalDraftPage, { metadata } from '../draft/page';

describe('ApprovalDraftHubClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { esntlId: 'DRAFTER', authorizationVersion: 'test-v1', permissions: ['APPROVAL_CREATE'] };
  });
  afterEach(() => cleanup());

  it('기안 권한이 있으면 들어오자마자 기안 창이 열리고, 탭 제목은 화면 이름(새 결재 기안)이다', () => {
    render(<ApprovalDraftPage />);
    expect(screen.getByRole('heading', { level: 1, name: '새 결재 기안' })).toBeTruthy();
    expect(screen.getByRole('dialog', { name: '새 결재 기안' })).toBeTruthy();
    // 종전 '결재 양식 작성 예시' 는 목업 시절의 이름이다 — 실제 기안 창을 여는 화면을 예시라고 부르지 않는다.
    expect(String(metadata.title)).toMatch(/^새 결재 기안 \| /);
  });

  it('창을 닫으면 기안 작성 단추로 다시 열고, 상신하면 결재함으로 간다', () => {
    render(<ApprovalDraftPage />);
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog', { name: '새 결재 기안' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '기안 작성' }));
    expect(screen.getByRole('dialog', { name: '새 결재 기안' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '상신 완료' }));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/approvals');
  });

  it('기안 권한이 없으면 창도 기안 작성 단추도 없이 사유를 말하고, 결재함으로 가는 길만 남긴다', () => {
    auth.user = { ...auth.user, permissions: [] };
    render(<ApprovalDraftPage />);
    expect(screen.queryByRole('dialog', { name: '새 결재 기안' })).toBeNull();
    expect(screen.queryByRole('button', { name: '기안 작성' })).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('결재를 올릴 권한이 없습니다.');
    expect(screen.getByRole('link', { name: '결재함으로' }).getAttribute('href')).toBe('/approvals');
  });
});
