/**
 * 권한 표 스크롤 상자의 두 변형(2026-10-05).
 *
 * 기본은 70vh 상자 그대로다(A5 계약). fill 은 업무면 fill 셸(카탈로그 §4) 안에서 70vh 대신 부모가 준 남은 높이를 채운다 —
 * 조건 밖에서는 기본과 같도록 70vh 를 지우지 않고 work-fill 조건 안에서만 덮는다. 두 변형 모두 넘칠 때만 이름 있는 키보드
 * 스크롤 영역이 되고(WCAG 2.1.1), 안쪽 sr-only 가 문서를 늘리지 않게 relative 다.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PermissionScrollRegion } from '../components/PermissionScrollRegion';

function setOverflow(scrollHeight: number, clientHeight: number) {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: clientHeight });
}

afterEach(() => {
  for (const prop of ['scrollHeight', 'clientHeight']) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 0 });
  }
});

const LABEL = '화면별 권한 표 스크롤 영역';

describe('PermissionScrollRegion', () => {
  it('기본은 70vh 상자이고 fill 클래스를 갖지 않는다', () => {
    const { container } = render(<PermissionScrollRegion label={LABEL}><table><tbody><tr><td>칸</td></tr></tbody></table></PermissionScrollRegion>);
    const box = container.firstElementChild as HTMLElement;

    expect(box).toHaveClass('relative', 'max-h-[min(70vh,48rem)]', 'overflow-auto');
    expect(box.className).not.toMatch(/work-fill:|print:/);
  });

  it('fill 은 조건 안에서 남은 높이를 채우고, 조건 밖의 70vh·인쇄 펼침을 함께 둔다', () => {
    const { container } = render(<PermissionScrollRegion label={LABEL} fill><table><tbody><tr><td>칸</td></tr></tbody></table></PermissionScrollRegion>);
    const box = container.firstElementChild as HTMLElement;

    expect(box).toHaveClass(
      'relative', 'overflow-auto', 'max-h-[min(70vh,48rem)]',
      'work-fill:max-h-[var(--work-fill-height)]', 'work-fill:min-h-[6rem]', 'work-fill:flex-1',
      'print:max-h-none', 'print:overflow-visible',
    );
    // 조건 안에서도 상한을 지우지 않는다 — 부모 사슬이 끊기면 내용 높이로 커져 안쪽 스크롤·고정 머리글이 사라진다.
    expect(box).not.toHaveClass('work-fill:max-h-none');
  });

  it.each([false, true])('넘치면 이름 있는 키보드 스크롤 영역이 된다 (fill=%s)', (fill) => {
    setOverflow(900, 300);
    render(<PermissionScrollRegion label={LABEL} fill={fill}><table><tbody><tr><td>칸</td></tr></tbody></table></PermissionScrollRegion>);

    expect(screen.getByRole('region', { name: LABEL })).toHaveAttribute('tabindex', '0');
  });

  it('넘치지 않으면 영역 속성을 붙이지 않는다(쓸모없는 탭 정지 금지)', () => {
    setOverflow(100, 300);
    render(<PermissionScrollRegion label={LABEL} fill><table><tbody><tr><td>칸</td></tr></tbody></table></PermissionScrollRegion>);

    expect(screen.queryByRole('region', { name: LABEL })).toBeNull();
  });
});
