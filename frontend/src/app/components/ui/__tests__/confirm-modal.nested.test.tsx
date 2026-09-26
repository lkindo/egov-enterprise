import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// 전역 테스트 설정이 확인 대화상자를 대역으로 바꾼다 — 이 파일은 실제 구현을 본다.
vi.unmock('@/app/components/ui/confirm-modal');

import { ConfirmProvider, useConfirm } from '../confirm-modal';

/**
 * [2026-09-26 DIP C8] 확인이 열린 채 다른 확인을 부르면 앞의 Promise 가 교체되어 영원히 끝나지 않았다 —
 * 그 흐름의 잠금(ref)과 비활성 버튼이 풀리지 않았다. 새 확인이 열리면 앞의 확인은 취소(false)로 끝난다.
 */
const results: Array<{ label: string; value: boolean }> = [];

function Harness() {
  const confirm = useConfirm();
  const ask = (label: string) => {
    void confirm({ title: `${label} 확인`, message: `${label} 할까요?`, confirmText: '확인' })
      .then((value) => results.push({ label, value }));
  };
  return (
    <>
      <button type="button" onClick={() => ask('첫째')}>첫째 묻기</button>
      <button type="button" onClick={() => ask('둘째')}>둘째 묻기</button>
    </>
  );
}

describe('ConfirmProvider 중첩 확인', () => {
  it('새 확인이 열리면 앞의 확인은 취소로 끝나고, 나중 확인은 사용자의 답으로 끝난다', async () => {
    results.length = 0;
    render(<ConfirmProvider><Harness /></ConfirmProvider>);

    fireEvent.click(screen.getByRole('button', { name: '첫째 묻기' }));
    expect(await screen.findByText('첫째 할까요?')).toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '둘째 묻기', hidden: true })); });
    expect(results).toEqual([{ label: '첫째', value: false }]);
    expect(await screen.findByText('둘째 할까요?')).toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '확인' })); });
    expect(results).toEqual([{ label: '첫째', value: false }, { label: '둘째', value: true }]);
  });

  it('하나만 열리면 종전처럼 답을 돌려준다', async () => {
    results.length = 0;
    render(<ConfirmProvider><Harness /></ConfirmProvider>);
    fireEvent.click(screen.getByRole('button', { name: '첫째 묻기' }));
    await screen.findByText('첫째 할까요?');

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '취소' })); });
    expect(results).toEqual([{ label: '첫째', value: false }]);
  });
});
