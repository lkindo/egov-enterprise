import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NativeSelect } from '@/components/ui/native-select';

/**
 * NativeSelect — 브라우저 기본 select 의 디자인 시스템 래퍼(2026-11-26 품질 평가 PR-3b 6번).
 * 속성·ref 를 그대로 넘기고, 목록형(multiple·size>1)은 여러 행을 보여야 하므로 높이를 고정하지 않는다(Codex 검토).
 */
describe('NativeSelect', () => {
  it('한 줄 선택은 밀도 토큰 높이를 쓰고, 속성·ref·호출부 클래스를 넘긴다', () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <NativeSelect ref={ref} aria-label="검색 대상" name="target" defaultValue="b" className="w-36" disabled>
        <option value="a">가</option>
        <option value="b">나</option>
      </NativeSelect>,
    );

    const select = screen.getByRole('combobox', { name: '검색 대상' });
    expect(ref.current).toBe(select);
    expect(select).toHaveValue('b');
    expect(select).toBeDisabled();
    expect(select).toHaveAttribute('name', 'target');
    expect(select).toHaveAttribute('data-slot', 'native-select');
    expect(select).toHaveClass('h-[var(--control-h)]', 'border-input', 'focus-visible:outline-hidden', 'w-36');
    expect(select).not.toHaveClass('h-auto');
  });

  it.each([
    ['multiple', { multiple: true }],
    ['size 4', { size: 4 }],
  ])('목록형(%s)은 높이를 고정하지 않아 여러 행이 보인다', (_label, listProps) => {
    render(
      <NativeSelect aria-label="대상 목록" {...listProps}>
        <option value="a">가</option>
        <option value="b">나</option>
        <option value="c">다</option>
        <option value="d">라</option>
      </NativeSelect>,
    );

    const select = screen.getByRole('listbox', { name: '대상 목록' });
    expect(select).toHaveClass('h-auto');
    expect(select).not.toHaveClass('h-[var(--control-h)]');
  });

  it('size 1 은 한 줄 선택과 같다', () => {
    render(
      <NativeSelect aria-label="한 줄" size={1}>
        <option value="a">가</option>
      </NativeSelect>,
    );
    // 브라우저는 size=1 을 한 줄 선택으로 그리지만, 시험 도구(aria-query)는 size 속성이 있으면 listbox 로 본다 — 이름으로 찾는다.
    const select = screen.getByLabelText('한 줄');
    expect(select).toHaveClass('h-[var(--control-h)]');
    expect(select).not.toHaveClass('h-auto');
  });
});
