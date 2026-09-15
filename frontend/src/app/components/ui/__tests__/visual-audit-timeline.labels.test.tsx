import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisualAuditTimeline, type AuditLog } from '../visual-audit-timeline';

/**
 * [2026-09-15 DEC-OPS-100] 최근 감사 이력은 저장된 판정만 그린다.
 *
 * 관리자 홈은 서비스·메서드 이름의 키워드로 동작과 중요도를 추측해 넘겼고, 타임라인은 그 값을
 * 영문 대문자 등급(HIGH·MEDIUM·LOW)으로, 맞지 않는 기록을 '수정'으로 그렸다. 추측이 운영 판정처럼
 * 보이면 안 되므로(term-operational-status) 값이 없으면 그리지 않는다.
 */
describe('VisualAuditTimeline 라벨', () => {
  const withoutJudgement: AuditLog = {
    id: 'log-1',
    entityName: 'UserService.updateUser',
    performedBy: '시스템',
    timestamp: '2026-09-15',
    ipAddress: '-',
    changes: [{ field: '이름', before: '가', after: '나' }],
  };

  it('동작·중요도가 없으면 추측한 동사나 등급을 그리지 않는다', () => {
    const { container } = render(<VisualAuditTimeline logs={[withoutJudgement]} />);

    expect(screen.getByText('UserService.updateUser')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/HIGH|MEDIUM|LOW|중요도/);
    expect(screen.queryByText('수정')).toBeNull();
    // 첫 기록은 펼쳐져 있다 — 변경 목록 머리글은 없는 엔진을 말하지 않는다.
    expect(screen.getByText('변경 내용')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/AI 기반|감지 엔진/);
  });

  it('저장된 동작과 중요도는 한국어로 그린다', () => {
    render(<VisualAuditTimeline logs={[{ ...withoutJudgement, id: 'log-2', action: 'DELETE', severity: 'high' }]} />);

    expect(screen.getByText('삭제')).toBeInTheDocument();
    expect(screen.getByText('중요도 높음')).toBeInTheDocument();
  });
});
