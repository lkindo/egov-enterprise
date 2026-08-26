import { useRef } from 'react';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '../useManualFormValidation';

const schema = z.object({
  title: z.string().trim().min(1, '제목을 입력해 주세요.').max(5, '제목은 5자 이내여야 합니다.'),
  count: z.coerce.number().int('수량은 정수여야 합니다.').min(1, '수량은 1 이상이어야 합니다.'),
});

describe('useManualFormValidation', () => {
  function SameNameForms() {
    const firstFormRef = useRef<HTMLFormElement>(null);
    const secondFormRef = useRef<HTMLFormElement>(null);
    const first = useManualFormValidation(schema, { form: () => firstFormRef.current });
    const second = useManualFormValidation(schema, { form: () => secondFormRef.current });

    return (
      <>
        <form ref={firstFormRef} aria-label="첫 번째 수동 폼">
          <FormErrorSummary errors={first.errors} onNavigate={first.focusError} />
          <input {...first.fieldProps('title')} aria-label="첫 번째 제목" />
          {first.errors.title ? <p {...first.messageProps('title')} /> : null}
          <button type="button" onClick={() => first.validate({ title: '', count: 1 })}>첫 번째 검사</button>
        </form>
        <form ref={secondFormRef} aria-label="두 번째 수동 폼">
          <FormErrorSummary errors={second.errors} onNavigate={second.focusError} />
          <input {...second.fieldProps('title')} aria-label="두 번째 제목" />
          {second.errors.title ? <p {...second.messageProps('title')} /> : null}
          <button type="button" onClick={() => second.validate({ title: '', count: 1 })}>두 번째 검사</button>
        </form>
      </>
    );
  }

  it('검증 실패를 throw하지 않고 DOM에서 먼저 보이는 오류 필드로 이동한다', async () => {
    const { result } = renderHook(() => useManualFormValidation(schema));
    const title = document.createElement('input');
    title.name = 'title';
    title.scrollIntoView = vi.fn();
    document.body.appendChild(title);
    const count = document.createElement('input');
    count.name = 'count';
    count.scrollIntoView = vi.fn();
    document.body.insertBefore(count, title);

    let parsed: unknown;
    expect(() => {
      act(() => {
        parsed = result.current.validate({ title: '', count: 0 });
      });
    }).not.toThrow();

    expect(parsed).toBeNull();
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    expect(document.activeElement).toBe(count);
    expect(count.scrollIntoView).toHaveBeenCalled();
    expect(result.current.errors.title).toBe('제목을 입력해 주세요.');
    expect(result.current.errors.count).toBe('수량은 1 이상이어야 합니다.');
  });

  it('필드 오류 연결 props와 수정 시 오류 해제를 제공한다', () => {
    const { result } = renderHook(() => useManualFormValidation(schema));

    act(() => {
      result.current.validate({ title: '123456', count: 1 });
    });

    const invalidProps = result.current.fieldProps('title');
    expect(invalidProps).toEqual({
      name: 'title',
      'aria-invalid': true,
      'aria-describedby': 'title-error',
      'aria-errormessage': 'title-error',
    });
    expect(result.current.messageProps('title').id).toBe(invalidProps['aria-errormessage']);

    act(() => result.current.clearError('title'));
    expect(result.current.fieldProps('title')).toEqual({
      name: 'title',
      'aria-invalid': undefined,
      'aria-describedby': undefined,
      'aria-errormessage': undefined,
    });
  });

  it('오류 요약에서 각 오류 위치로 이동할 수 있다', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(
      <FormErrorSummary
        errors={{ title: '제목을 입력해 주세요.' }}
        labels={{ title: '설문명' }}
        onNavigate={navigate}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('입력 오류 1개');
    await user.click(screen.getByRole('button', { name: /설문명.*제목을 입력/ }));
    expect(navigate).toHaveBeenCalledWith('title');
  });

  it('동일한 name의 독립 폼이 여러 개여도 소유 폼 안에서만 오류 위치를 찾는다', async () => {
    const user = userEvent.setup();
    render(<SameNameForms />);
    const firstForm = screen.getByRole('form', { name: '첫 번째 수동 폼' });
    const secondForm = screen.getByRole('form', { name: '두 번째 수동 폼' });

    await user.click(within(firstForm).getByRole('button', { name: '첫 번째 검사' }));
    await waitFor(() => expect(within(firstForm).getByRole('textbox', { name: '첫 번째 제목' })).toHaveFocus());
    await user.click(within(secondForm).getByRole('button', { name: '두 번째 검사' }));

    await waitFor(() => expect(within(secondForm).getByRole('textbox', { name: '두 번째 제목' })).toHaveFocus());
    expect(within(secondForm).getAllByRole('alert')).toHaveLength(1);
    const firstMessageId = within(firstForm).getByRole('textbox', { name: '첫 번째 제목' })
      .getAttribute('aria-errormessage');
    const secondMessageId = within(secondForm).getByRole('textbox', { name: '두 번째 제목' })
      .getAttribute('aria-errormessage');
    expect(firstMessageId).not.toBe(secondMessageId);
    expect(within(firstForm).getByText('제목을 입력해 주세요.')).toHaveAttribute('id', firstMessageId);
    expect(within(secondForm).getByText('제목을 입력해 주세요.')).toHaveAttribute('id', secondMessageId);
    expect(within(firstForm).getByRole('textbox', { name: '첫 번째 제목' })).not.toHaveFocus();
  });

  it('유효한 값은 정수로 변환하고 오류를 지운다', () => {
    const { result } = renderHook(() => useManualFormValidation(schema));
    act(() => {
      result.current.validate({ title: '', count: 0 });
    });

    let parsed: z.output<typeof schema> | null = null;
    act(() => {
      parsed = result.current.validate({ title: '제목', count: '2' });
    });

    expect(parsed).toEqual({ title: '제목', count: 2 });
    expect(result.current.errors).toEqual({});
  });
});
