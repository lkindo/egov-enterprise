import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BulkUserDepartmentDialog } from '../UserBulkActionDialogs';
import type { UserManage } from '@/types/foundation/user';

/**
 * 부서 일괄 이동 대화상자의 빈 목록 문구.
 *
 * [2026-11-07 화면 용어 원장 검토] 대화상자가 조회 중 여부만 받아, 부서 조회가 실패해도 '이동할 수 있는 부서가 없습니다' 라고
 * 말했다(server-error 의 mustNotImply: 데이터 없음). 실패는 실패로 말하고 다시 불러올 길을 준다.
 */
const USERS = [{ userId: 'kim01', userNm: '김하나', esntlId: 'E-1' }] as UserManage[];

function renderDialog(overrides: Partial<React.ComponentProps<typeof BulkUserDepartmentDialog>> = {}) {
  const onRetry = vi.fn();
  render(
    <BulkUserDepartmentDialog
      isOpen
      users={USERS}
      isSaving={false}
      onClose={vi.fn()}
      footer={null}
      departments={[]}
      isLoading={false}
      isError={false}
      onRetry={onRetry}
      departmentId=""
      onDepartmentChange={vi.fn()}
      {...overrides}
    />,
  );
  return { onRetry };
}

describe('부서 일괄 이동 — 빈 목록', () => {
  it('부서 조회가 실패하면 부서가 없다고 말하지 않고 실패를 알리며 다시 불러올 수 있다', () => {
    const { onRetry } = renderDialog({ isError: true });

    expect(screen.getByRole('alert')).toHaveTextContent('부서 목록을 불러오지 못했습니다.');
    expect(screen.queryByText('이동할 수 있는 부서가 없습니다.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '부서 목록 다시 불러오기' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('조회가 끝났는데 부서가 없으면 그대로 말한다', () => {
    renderDialog();

    expect(screen.getByText('이동할 수 있는 부서가 없습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('불러오는 중에는 부서가 없다고 말하지 않는다', () => {
    renderDialog({ isLoading: true });

    expect(screen.getByText('부서 목록을 불러오는 중입니다...')).toBeInTheDocument();
    expect(screen.queryByText('이동할 수 있는 부서가 없습니다.')).not.toBeInTheDocument();
  });
});
