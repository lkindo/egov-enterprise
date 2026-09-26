import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DepartmentForm } from '../DepartmentForm';

/**
 * [2026-09-26 DIP C5] 등록 폼에서 상위 부서를 고른다.
 * 종전에는 새 부서가 늘 최상위로 만들어져, 하위로 두려면 조직 구조에서 다시 끌어야 했다.
 */
const OPTIONS = [
  { ognzId: 'D-1', label: '본부' },
  { ognzId: 'D-2', label: '　개발팀' },
];

describe('DepartmentForm 상위 부서', () => {
  it('등록은 고른 상위 부서를 함께 보낸다', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<DepartmentForm mode="create" parentOptions={OPTIONS} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByRole('textbox', { name: /부서 명칭/ }), { target: { value: '신규팀' } });
    fireEvent.change(screen.getByRole('combobox', { name: '상위 부서' }), { target: { value: 'D-2' } });
    fireEvent.click(screen.getByRole('button', { name: /부서 등록/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ ognzNm: '신규팀', upOgnzId: 'D-2' })));
  });

  it('고르지 않으면 최상위로 등록한다', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<DepartmentForm mode="create" parentOptions={OPTIONS} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: '상위 부서' })).toHaveValue('');
    fireEvent.change(screen.getByRole('textbox', { name: /부서 명칭/ }), { target: { value: '최상위팀' } });
    fireEvent.click(screen.getByRole('button', { name: /부서 등록/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ upOgnzId: '' })));
  });

  it('수정은 계층을 바꾸지 않으므로 상위 부서를 묻지 않는다', () => {
    render(<DepartmentForm mode="edit" initialData={{ ognzNm: '기존팀' }} parentOptions={OPTIONS} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('combobox', { name: '상위 부서' })).not.toBeInTheDocument();
  });
});
