/**
 * `Calendar` 래퍼의 `classNames` 어휘가 실제로 적용되는지 고정한다.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 우리 래퍼는 react-day-picker 의 **v9 classNames 키**(`month_caption`·`button_previous`·
 * `month_grid`·`weekday`·`day_button`·`selected`…)에 전면 의존한다. 그런데 이 라이브러리는
 * 메이저마다 그 어휘를 바꿔 왔다(v8→v9 에서 이미 한 번 전면 개명).
 *
 * ⚠ **키가 바뀌어도 아무것도 실패하지 않는다** — 라이브러리는 모르는 키를 조용히 무시하고,
 *   우리 클래스는 어디에도 붙지 않은 채 달력이 무스타일로 렌더된다. 타입 검사도 통과한다
 *   (`ComponentProps<typeof DayPicker>` 의 classNames 는 느슨한 레코드다).
 *
 * 그래서 "키가 선언돼 있다" 가 아니라 **"그 클래스가 DOM 에 실제로 붙는다"** 를 본다.
 * 메이저 승급에서 어휘가 바뀌면 이 계약이 먼저 red 가 된다.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Calendar } from '../calendar';

describe('Calendar classNames 어휘가 실제로 적용된다', () => {
  it('날짜 버튼에 우리 클래스가 붙는다 — e2e 선택자가 여기에 의존한다', () => {
    const { container } = render(<Calendar mode="single" defaultMonth={new Date(2026, 7, 1)} />);

    // `day_button` 키가 살아 있어야 이 클래스가 붙는다. e2e 의 날짜 선택이 이걸 쓴다.
    expect(container.querySelectorAll('.e2e-day-button').length).toBeGreaterThan(0);
  });

  it('이전·다음 달 버튼에 우리 클래스가 붙는다', () => {
    const { container } = render(<Calendar mode="single" defaultMonth={new Date(2026, 7, 1)} />);

    // `button_previous` / `button_next` 키가 바뀌면 절대 배치(absolute left-1/right-1)가 사라진다.
    expect(container.querySelector('.absolute.left-1')).not.toBeNull();
    expect(container.querySelector('.absolute.right-1')).not.toBeNull();
  });

  it('요일 헤더와 주 행에 우리 클래스가 붙는다', () => {
    const { container } = render(<Calendar mode="single" defaultMonth={new Date(2026, 7, 1)} />);

    // `weekday` / `week` 키 — 표 골격의 간격과 정렬을 이 클래스가 만든다.
    expect(container.querySelector('.text-\\[0\\.8rem\\]')).not.toBeNull();
    expect(container.querySelectorAll('.flex.w-full.mt-2').length).toBeGreaterThan(0);
  });

  it('월 제목이 렌더된다 — month_caption/caption_label 경로', () => {
    render(<Calendar mode="single" defaultMonth={new Date(2026, 7, 1)} />);

    // 라이브러리가 주는 기본 캡션 텍스트. 구조가 바뀌면 여기서 먼저 드러난다.
    expect(screen.getByText(/August 2026|2026/)).toBeInTheDocument();
  });

  it('호출부가 넘긴 classNames 가 래퍼 기본값을 덮어쓴다', () => {
    const { container } = render(
      <Calendar mode="single" defaultMonth={new Date(2026, 7, 1)} classNames={{ month: 'overridden-month' }} />,
    );

    // `...classNames` 전개가 살아 있어야 소비자가 조정할 수 있다.
    expect(container.querySelector('.overridden-month')).not.toBeNull();
  });
});
