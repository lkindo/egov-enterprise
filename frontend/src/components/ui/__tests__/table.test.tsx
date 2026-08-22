import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Table, TableBody, TableCell, TableRow } from '../table';

let isOverflowing = true;
let clientWidthDescriptor: PropertyDescriptor | undefined;
let scrollWidthDescriptor: PropertyDescriptor | undefined;

describe('Table scroll region accessibility', () => {
  beforeEach(() => {
    isOverflowing = true;
    clientWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    scrollWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return (this as HTMLElement).dataset.slot === 'table-container' ? 320 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        if ((this as HTMLElement).dataset.slot !== 'table-container') return 0;
        return isOverflowing ? 640 : 320;
      },
    });
  });

  afterEach(() => {
    if (clientWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidthDescriptor);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
    }
    if (scrollWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'scrollWidth', scrollWidthDescriptor);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth');
    }
  });

  it('실제로 넘치는 표만 이름 있는 키보드 스크롤 영역으로 만든다', () => {
    render(
      <Table scrollRegionLabel="사용자 표 스크롤 영역">
        <TableBody><TableRow><TableCell>홍길동</TableCell></TableRow></TableBody>
      </Table>,
    );

    const region = screen.getByRole('region', { name: '사용자 표 스크롤 영역' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('focus-visible:ring-2');
    region.focus();
    expect(region).toHaveFocus();
  });

  it('넘치지 않는 표는 불필요한 탭 정지점과 region 역할을 만들지 않는다', () => {
    isOverflowing = false;
    render(
      <Table scrollRegionLabel="사용자 표 스크롤 영역">
        <TableBody><TableRow><TableCell>홍길동</TableCell></TableRow></TableBody>
      </Table>,
    );

    const container = document.querySelector<HTMLElement>('[data-slot="table-container"]');
    expect(container).not.toHaveAttribute('tabindex');
    expect(container).not.toHaveAttribute('role');
    expect(container).not.toHaveAttribute('aria-label');
  });
});
