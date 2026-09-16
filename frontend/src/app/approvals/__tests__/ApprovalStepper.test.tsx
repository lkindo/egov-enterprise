import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApprovalStepper } from '../ApprovalStepper';

describe('결재선 실제 단계와 전원 승인', () => {
  it('현재 병렬 단계의 내 차례와 다음 단계 대기를 구분한다', () => {
    render(<ApprovalStepper currentUserId="me" stages={[
      { order: 1, kind: 'APPROVAL', status: 'ACTIVE', approvers: [
        { userId: 'done', userNm: '김완료', status: 'APPROVED', opinion: '예산 확인', decidedAt: '2026-09-16T09:00:00' },
        { userId: 'me', userNm: '나', status: 'ACTIVE' },
      ] },
      { order: 2, kind: 'AGREEMENT', status: 'WAITING', approvers: [{ userId: 'next', userNm: '이합의', status: 'WAITING' }] },
    ]} />);
    expect(screen.getByText('나 · 내 차례')).toBeInTheDocument();
    expect(screen.getByText('이합의 · 앞 단계 대기')).toBeInTheDocument();
    expect(screen.getByText('전원 승인 · 1/2명 완료')).toBeInTheDocument();
    expect(screen.getByText('전원 동의 · 0/1명 완료')).toBeInTheDocument();
    expect(screen.getByText('예산 확인')).toBeInTheDocument();
    expect(screen.getByText('2026-09-16 09:00:00')).toHaveAttribute('datetime', '2026-09-16T09:00:00');
    expect(within(screen.getByLabelText('결재선 진행')).getAllByRole('listitem').filter(item => item.getAttribute('aria-current') === 'step')).toHaveLength(1);
  });
  it('과거 차수의 결재선은 현재 결재선과 구별되는 접근성 이름을 갖는다', () => {
    render(<>
      <ApprovalStepper stages={[{ order: 1, kind: 'APPROVAL', status: 'ACTIVE', approvers: [] }]} />
      <ApprovalStepper accessibleLabel="1차 결재선 진행" stages={[{ order: 1, kind: 'APPROVAL', status: 'REJECTED', approvers: [] }]} />
      <ApprovalStepper accessibleLabel="2차 결재선 진행" steps={[{ label: '결재', user: '이전 결재자', status: 'completed' }]} />
    </>);
    expect(screen.getByRole('list', { name: '결재선 진행' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: '1차 결재선 진행' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: '2차 결재선 진행' })).toBeInTheDocument();
  });
  it('합의 전원 완료를 승인과 다른 동의 문구로 표시한다', () => {
    render(<ApprovalStepper stages={[{ order: 1, kind: 'AGREEMENT', status: 'APPROVED', approvers: [{ userId: 'a', userNm: '합의자', status: 'APPROVED' }, { userId: 'b', userNm: '검토자', status: 'APPROVED' }] }]} />);
    expect(screen.getByText('1단계 · 합의 · 완료')).toBeInTheDocument();
    expect(screen.getByText('전원 동의 · 2/2명 완료')).toBeInTheDocument();
    expect(screen.getByText('합의자 · 동의 완료')).toBeInTheDocument();
    expect(screen.queryByText(/내 차례/)).not.toBeInTheDocument();
  });
  it('반려와 취소된 남은 단계를 대기 또는 완료로 위장하지 않는다', () => {
    render(<ApprovalStepper stages={[
      { order: 1, kind: 'APPROVAL', status: 'REJECTED', approvers: [{ userId: 'a', userNm: '반려자', status: 'REJECTED', opinion: '일정 보완 필요' }] },
      { order: 2, kind: 'APPROVAL', status: 'CANCELLED', approvers: [{ userId: 'b', userNm: '후속 결재자', status: 'CANCELLED' }] },
    ]} />);
    expect(screen.getByText('반려자 · 반려')).toBeInTheDocument();
    expect(screen.getByText('후속 결재자 · 중단')).toBeInTheDocument();
    expect(screen.getByText('일정 보완 필요')).toBeInTheDocument();
    expect(screen.queryByText(/내 차례|앞 단계 대기/)).not.toBeInTheDocument();
  });
});
