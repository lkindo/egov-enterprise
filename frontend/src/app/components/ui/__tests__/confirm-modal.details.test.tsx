import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// 전역 테스트 설정이 확인 대화상자를 대역으로 바꾼다 — 이 파일은 실제 구현을 본다.
vi.unmock('@/app/components/ui/confirm-modal');
// 처음 포커스는 실제 Radix 가 정한다(onOpenAutoFocus) — 전역 Dialog 대역은 포커스를 옮기지 않아 처음 포커스를 볼 수 없다.
// (2026-10-05 통합: 대역으로는 두 포커스 테스트가 늘 실패해 실제 구현을 쓰도록 바꿨다 — standard-modal.focus.test 와 같은 방식.)
vi.unmock('@/components/ui/dialog');

import { ConfirmProvider, useConfirm } from '../confirm-modal';

/**
 * [2026-10-05] 확인 대화상자의 details — 설명 한 문장 아래에 확인할 항목 목록(예: 메뉴 구조 저장의 변경 목록)을 이름 있는
 * 스크롤 영역으로 보인다. 키보드로도 스크롤할 수 있게 탭 순서에 든다. details 가 없으면 영역을 그리지 않는다.
 */
function Harness({ withDetails }: { withDetails: boolean }) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={() => {
        void confirm({
          title: '메뉴 구조 저장',
          message: '위치 1개를 저장합니다.',
          confirmText: '변경 저장',
          ...(withDetails ? { detailsLabel: '저장할 변경 목록', details: <ul><li>결재함 — 순서 변경</li></ul> } : {}),
        });
      }}
    >
      저장 묻기
    </button>
  );
}

describe('ConfirmProvider details', () => {
  it('details 를 이름 있는 스크롤 영역으로 보인다', async () => {
    render(<ConfirmProvider><Harness withDetails /></ConfirmProvider>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '저장 묻기' })); });

    const region = await screen.findByRole('region', { name: '저장할 변경 목록' });
    expect(within(region).getByText('결재함 — 순서 변경')).toBeInTheDocument();
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.className).toMatch(/overflow-y-auto/);
    expect(region.className).toMatch(/max-h-/);
    expect(region.className.split(/\s+/)).toContain('relative');
    expect(screen.getByText('위치 1개를 저장합니다.')).toBeInTheDocument();
  });

  it('details 가 있어도 처음 포커스는 취소 단추다 — 스크롤 상자는 탭 순서에만 든다', async () => {
    render(<ConfirmProvider><Harness withDetails /></ConfirmProvider>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '저장 묻기' })); });
    const region = await screen.findByRole('region', { name: '저장할 변경 목록' });
    await waitFor(() => expect(screen.getByRole('button', { name: '취소' })).toHaveFocus());
    expect(region).not.toHaveFocus();
  });

  it('details 가 없을 때도 처음 포커스는 취소 단추다(종전과 같다)', async () => {
    render(<ConfirmProvider><Harness withDetails={false} /></ConfirmProvider>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '저장 묻기' })); });
    await waitFor(() => expect(screen.getByRole('button', { name: '취소' })).toHaveFocus());
  });

  it('details 가 없으면 영역을 그리지 않는다', async () => {
    render(<ConfirmProvider><Harness withDetails={false} /></ConfirmProvider>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '저장 묻기' })); });
    await screen.findByText('위치 1개를 저장합니다.');
    expect(screen.queryByRole('region', { name: '저장할 변경 목록' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-confirm-details]')).toBeNull();
  });
});
