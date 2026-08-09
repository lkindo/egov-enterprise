vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StandardModal } from '../standard-modal';

/**
 * StandardModal 계약 테스트.
 *
 * 종전 이 파일은 `expect(true).toBe(true)` 한 줄이었다. "Shadcn Dialog 는 포털로 렌더되니
 * 컴포넌트 호출 존재만 확인한다"는 주석이 붙어 있었지만, StandardModal 은 Shadcn Dialog 를
 * 쓰지 않는다 — react-dom 의 createPortal 로 document.body 에 직접 렌더한다.
 * 그리고 포털 대상이 document.body 이므로 RTL 의 screen 쿼리(document.body 기준)로
 * 그대로 관측된다. 즉 검증을 포기할 이유가 애초에 없었고, 그 결과 이 파일은
 * 컴포넌트가 무엇을 하든 항상 green 인 거짓 안전감만 제공했다.
 */

afterEach(() => {
  // 스크롤 잠금은 body 전역 상태라 테스트 간 누수를 막는다.
  document.body.style.overflow = '';
});

/** 닫기 버튼 — 헤더의 X 아이콘을 감싼 버튼(lucide 는 setup 에서 span 으로 모킹된다). */
function getCloseButton() {
  const button = screen.getByTestId('icon-x').closest('button');
  expect(button).not.toBeNull();
  return button as HTMLButtonElement;
}

describe('StandardModal', () => {
  it('isOpen=true 이면 제목과 children 을 렌더한다', () => {
    render(
      <StandardModal isOpen onClose={() => { }} title="기본 제목">
        <div>본문 내용</div>
      </StandardModal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '기본 제목' })).toBeInTheDocument();
    expect(screen.getByText('본문 내용')).toBeInTheDocument();
  });

  it('isOpen=false 이면 아무것도 렌더하지 않는다', () => {
    render(
      <StandardModal isOpen={false} onClose={() => { }} title="기본 제목">
        <div>본문 내용</div>
      </StandardModal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('본문 내용')).not.toBeInTheDocument();
    expect(screen.queryByText('기본 제목')).not.toBeInTheDocument();
  });

  it('열림/닫힘 전환이 DOM 에 반영된다', () => {
    const { rerender } = render(
      <StandardModal isOpen onClose={() => { }} title="전환 제목">
        <div>본문 내용</div>
      </StandardModal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <StandardModal isOpen={false} onClose={() => { }} title="전환 제목">
        <div>본문 내용</div>
      </StandardModal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('모달 역할·라벨 등 접근성 속성을 갖춘다', () => {
    render(
      <StandardModal isOpen onClose={() => { }} title="접근성 제목">
        <div>본문 내용</div>
      </StandardModal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', '접근성 제목');
  });

  it('닫기 버튼을 누르면 onClose 를 호출한다', async () => {
    const onClose = vi.fn();
    render(
      <StandardModal isOpen onClose={onClose} title="기본 제목">
        <div>본문 내용</div>
      </StandardModal>
    );

    await userEvent.click(getCloseButton());

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('배경(backdrop)을 누르면 onClose 를 호출한다', () => {
    const onClose = vi.fn();
    render(
      <StandardModal isOpen onClose={onClose} title="기본 제목">
        <div>본문 내용</div>
      </StandardModal>
    );

    // 배경은 role 도 라벨도 없는 순수 오버레이라 구조로만 지목할 수 있다.
    // (포털 루트의 첫 자식 = 오버레이, 둘째 = role="dialog" 패널)
    const backdrop = screen.getByRole('dialog').parentElement?.firstElementChild;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('본문 클릭은 onClose 를 호출하지 않는다', async () => {
    const onClose = vi.fn();
    render(
      <StandardModal isOpen onClose={onClose} title="기본 제목">
        <button type="button">본문 버튼</button>
      </StandardModal>
    );

    await userEvent.click(screen.getByRole('button', { name: '본문 버튼' }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('footer 는 전달됐을 때만 렌더한다', () => {
    const { rerender } = render(
      <StandardModal isOpen onClose={() => { }} title="기본 제목">
        <div>본문 내용</div>
      </StandardModal>
    );
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();

    rerender(
      <StandardModal
        isOpen
        onClose={() => { }}
        title="기본 제목"
        footer={<button type="button">저장</button>}
      >
        <div>본문 내용</div>
      </StandardModal>
    );
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('maxWidth 를 대응하는 폭 클래스로 매핑한다', () => {
    render(
      <StandardModal isOpen onClose={() => { }} title="기본 제목" maxWidth="3xl">
        <div>본문 내용</div>
      </StandardModal>
    );

    expect(screen.getByRole('dialog')).toHaveClass('max-w-3xl');
  });

  it('maxWidth 기본값은 md 다', () => {
    render(
      <StandardModal isOpen onClose={() => { }} title="기본 제목">
        <div>본문 내용</div>
      </StandardModal>
    );

    expect(screen.getByRole('dialog')).toHaveClass('max-w-md');
  });

  it('열려 있는 동안 body 스크롤을 잠그고 닫히면 되돌린다', () => {
    const { rerender } = render(
      <StandardModal isOpen onClose={() => { }} title="기본 제목">
        <div>본문 내용</div>
      </StandardModal>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <StandardModal isOpen={false} onClose={() => { }} title="기본 제목">
        <div>본문 내용</div>
      </StandardModal>
    );
    expect(document.body.style.overflow).toBe('unset');
  });

  it('언마운트되면 body 스크롤 잠금을 해제한다', () => {
    const { unmount } = render(
      <StandardModal isOpen onClose={() => { }} title="기본 제목">
        <div>본문 내용</div>
      </StandardModal>
    );
    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    // 잠금을 남긴 채 사라지면 페이지 전체가 스크롤 불가로 굳는다.
    expect(document.body.style.overflow).toBe('unset');
  });
});
