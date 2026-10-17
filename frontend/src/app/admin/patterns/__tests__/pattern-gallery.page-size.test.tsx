import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PatternGalleryClient from '../PatternGalleryClient';

// Radix Select 상호작용에 필요한 PointerEvent 를 JSDOM 에 둔다(standard-data-table-sorting.test.tsx 와 같은 방식).
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type: string, props: PointerEventInit = {}) {
      super(type, props);
    }
  }
  window.PointerEvent = PointerEvent as unknown as typeof window.PointerEvent;
}

/**
 * 패턴 갤러리 페이지당 건수 — 이 화면은 서버 조회 없이 표본 행을 잘라 보인다(페이지 크기 census 의 클라이언트 페이징 목록).
 * census 는 크기 변경 콜백이 있는지만 보므로, 고른 크기가 slice 계산에 쓰인다는 사유 문장은 이 시험이 지킨다.
 * 죽은 컨트롤을 두지 않는다는 G10 이 이 참조 화면 자체에도 적용된다(pattern-gallery.test.tsx 머리말).
 */
describe('업무 화면 패턴 갤러리 페이지당 건수', () => {
  it('20개씩을 고르면 표본 12건이 한 쪽에 모두 보인다(기본 10건)', async () => {
    render(<PatternGalleryClient />);
    expect(screen.getAllByTestId(/^pattern-gallery-row/)).toHaveLength(10);

    fireEvent.click(screen.getByLabelText('페이지당 항목 수'));
    fireEvent.click(await screen.findByRole('option', { name: '20개씩' }));

    expect(screen.getAllByTestId(/^pattern-gallery-row/)).toHaveLength(12);
  });
});
