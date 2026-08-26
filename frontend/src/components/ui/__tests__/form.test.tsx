import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import {
  Form,
  FormControl,
  FormErrorSummary,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../form';
import { Input } from '../input';
import { FormField as StandardFormField } from '@/app/components/ui/standard-form';

type Values = {
  userNm: string;
};

function InvalidFieldHarness() {
  const form = useForm<Values>({ defaultValues: { userNm: '' } });

  React.useEffect(() => {
    form.setError('userNm', { type: 'manual', message: '이름을 입력하세요.' });
  }, [form]);

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="userNm"
        required
        render={({ field }) => (
          <FormItem>
            <FormLabel>이름</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}

function SummaryHarness({ onNavigate }: { onNavigate: (name: string) => void }) {
  const form = useForm<Values>({ defaultValues: { userNm: '' } });

  React.useEffect(() => {
    form.setError('userNm', { type: 'manual', message: '이름을 입력하세요.' });
  }, [form]);

  return (
    <Form {...form}>
      <FormErrorSummary labels={{ userNm: '사용자 이름' }} onNavigate={onNavigate} />
    </Form>
  );
}

describe('form accessibility contract', () => {
  it('provider 밖의 FormLabel 사용을 명확한 오류로 차단한다', () => {
    expect(() => render(<FormLabel>이름</FormLabel>))
      .toThrow('useFormField should be used within <FormField>');
  });

  it('errors를 받지 않은 오류 요약은 Form provider 누락을 명확히 안내한다', () => {
    expect(() => render(<FormErrorSummary />))
      .toThrow('FormErrorSummary should be used within <Form> or receive errors');
  });

  it('required와 invalid 관계를 label/control/message에 연결한다', async () => {
    render(<InvalidFieldHarness />);

    const input = screen.getByRole('textbox', { name: /이름/ });
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-errormessage');
    const messageId = input.getAttribute('aria-errormessage');
    expect(messageId).toBeTruthy();
    expect(document.getElementById(messageId!)).toHaveTextContent('이름을 입력하세요.');
    expect(screen.getByText('(필수)')).toHaveClass('sr-only');
  });

  it('오류 요약을 한 번 발화하고 오류 링크로 해당 필드 이동을 요청한다', async () => {
    const onNavigate = vi.fn();
    render(<SummaryHarness onNavigate={onNavigate} />);

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveAttribute('aria-live', 'assertive');
    expect(summary).toHaveAttribute('aria-atomic', 'true');
    expect(summary).toHaveTextContent('입력 오류 1개');

    await userEvent.click(screen.getByRole('button', { name: /사용자 이름.*이름을 입력하세요/ }));
    expect(onNavigate).toHaveBeenCalledWith('userNm');
  });

  it('RHF provider가 없는 raw form 오류도 같은 요약 API로 렌더한다', async () => {
    const onNavigate = vi.fn();
    render(
      <FormErrorSummary
        errors={{ userNm: '이름을 입력하세요.' }}
        labels={{ userNm: '사용자 이름' }}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('입력 오류 1개');
    await userEvent.click(screen.getByRole('button', { name: /사용자 이름.*이름을 입력하세요/ }));
    expect(onNavigate).toHaveBeenCalledWith('userNm');
  });

  it('오류 요약이 있는 legacy FormField의 inline 오류는 중복 alert를 만들지 않는다', () => {
    render(
      <form aria-label="legacy 검증 폼">
        <FormErrorSummary errors={{ userNm: '이름을 입력하세요.' }} />
        <StandardFormField label="이름" htmlFor="userNm" error="이름을 입력하세요.">
          <input id="userNm" aria-label="이름" aria-errormessage="userNm-error" />
        </StandardFormField>
      </form>,
    );

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(document.getElementById('userNm-error')).toHaveTextContent('이름을 입력하세요.');
  });

  it('nested field-array와 root 오류를 평탄화하되 root 오류는 이동 버튼으로 만들지 않는다', () => {
    render(
      <FormErrorSummary
        errors={{
          members: [{ emlAddr: { type: 'validate', message: '이메일을 확인하세요.' } }],
          root: { server: { type: 'server', message: '저장할 수 없습니다.' } },
        }}
        labels={{ 'members.0.emlAddr': '첫 번째 이메일', 'root.server': '저장 오류' }}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('입력 오류 2개');
    expect(screen.getByRole('button', { name: /첫 번째 이메일.*이메일을 확인하세요/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /저장 오류/ })).not.toBeInTheDocument();
    expect(screen.getByText('저장 오류')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('저장할 수 없습니다.');
  });
});
