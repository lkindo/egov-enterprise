import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PinnedBadge, PostingStatusBadge, PostingStatusLabel } from '../PostingStatusBadge';

/**
 * 게시 상태 표지(ADR-0040 결정 3·DEC-OPS-140). 상태는 서버 판정 그대로다 — 화면이 날짜로 다시 계산하면, 서버가 게시 중이라고 한 글의
 * 종료일이 브라우저 기준으로 지났을 때 '게시 종료' 를 붙인다(종전 PostingEndedBadge 의 동작).
 */
describe('PostingStatusBadge', () => {
  it('예약 글은 시작일과 함께 다른 사용자에게 보이지 않는다고 말한다', () => {
    render(<PostingStatusBadge status="SCHEDULED" startYmd="20261101" />);
    const badge = screen.getByText('예약');
    expect(badge).toHaveAttribute('title', '게시 시작일 2026-11-01 전이라 다른 사용자에게는 보이지 않습니다.');
    expect(badge).toHaveTextContent('예약 · 게시 시작일 2026-11-01');
  });

  it('게시 종료 글은 게시 종료로 보인다', () => {
    render(<PostingStatusBadge status="ENDED" startYmd={null} />);
    expect(screen.getByText('게시 종료')).toHaveAttribute('title', '게시 종료일이 지나 다른 사용자에게는 보이지 않습니다.');
  });

  it('서버가 게시 중이라고 하면 종료일·시작일 값과 무관하게 아무것도 그리지 않는다 — 날짜를 다시 계산하지 않는다', () => {
    // 종료일이 이미 지난 값이어도 서버 판정이 POSTING 이면 표지가 없다(서버 기준일과 브라우저의 오늘이 다를 수 있다).
    const { container, rerender } = render(<PostingStatusBadge status="POSTING" startYmd="20990101" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PostingStatusBadge status={null} startYmd="20990101" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PostingStatusBadge />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('PostingStatusLabel', () => {
  it.each([
    ['POSTING', '게시 중'],
    ['SCHEDULED', '예약'],
    ['ENDED', '게시 종료'],
  ] as const)('%s 는 점과 글자로 %s 를 말한다(색만으로 구분하지 않는다)', (status, label) => {
    const { container } = render(<PostingStatusLabel status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('상태가 없으면 지어내지 않는다', () => {
    render(<PostingStatusLabel status={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

/** 상단 고정 표지(ADR-0040 결정 5). 서버가 지금 고정 중이라고 판정한 글에만 붙는다 — 화면이 종료일을 오늘과 비교하지 않는다. */
describe('PinnedBadge', () => {
  it('고정 중인 글은 상단 고정과 종료일을 말한다', () => {
    render(<PinnedBadge pinned endYmd="20261130" />);
    const badge = screen.getByText('상단 고정');
    expect(badge).toHaveAttribute('title', '2026-11-30까지 게시판 목록 맨 위에 고정한 글입니다.');
    expect(badge).toHaveTextContent('상단 고정 · 2026-11-30까지');
  });

  it('서버가 고정 중이 아니라고 하면 종료일 값과 무관하게 그리지 않는다 — 날짜를 다시 계산하지 않는다', () => {
    // 종료일이 먼 미래여도 서버 판정이 false·null 이면 표지가 없다(서버 기준일과 브라우저의 오늘이 다를 수 있다).
    const { container, rerender } = render(<PinnedBadge pinned={false} endYmd="20991231" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PinnedBadge pinned={null} endYmd="20991231" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PinnedBadge />);
    expect(container).toBeEmptyDOMElement();
  });
});
