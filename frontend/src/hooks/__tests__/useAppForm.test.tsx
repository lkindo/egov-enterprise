import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, act, waitFor, screen, fireEvent } from '@testing-library/react';
import { z } from 'zod';
import { useAppForm } from '../useAppForm';

const mocks = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError },
}));

const schema = z.object({
  pswd: z.string().min(8),
  emlAddr: z.string().email(),
});

/**
 * [W1-14 보완] 이 파일이 지키는 것: **헬퍼가 캐스팅 없이 호출 가능한가**.
 *
 * `applyServerErrors` 는 런타임에는 존재했지만 `useAppForm` 의 선언 반환 타입이
 * `UseFormReturn<T>` 이라 타입 표면에 없었다 — 호출하면 TS2339 로 컴파일이 깨졌고,
 * 소비 호출부가 0건이라 `tsc --noEmit` 는 계속 green 이었다.
 * 즉 '헬퍼를 제공했다' 는 주장을 반증할 수단이 저장소에 하나도 없었다.
 *
 * 아래 호출은 `as any` 없이 쓰인다. 반환 타입이 `UseFormReturn` 으로 되돌아가면
 * 이 파일이 **타입 검사 단계에서** 깨지므로(`npx tsc --noEmit`, pre-push HARD 게이트),
 * 회귀가 조용할 수 없다.
 */
describe('useAppForm.applyServerErrors', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('첫 오류 필드로 포커스를 옮긴다', async () => {
    const input = document.createElement('input');
    input.setAttribute('name', 'pswd');
    input.scrollIntoView = vi.fn();
    input.focus = vi.fn();
    document.body.appendChild(input);

    const { result } = renderHook(() => useAppForm(schema));

    await act(async () => {
      result.current.applyServerErrors({
        response: { data: { errors: [{ field: 'pswd', message: '8자 이상' }] } },
      });
    });

    await waitFor(() => expect(input.focus).toHaveBeenCalled());
    expect(input.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('오류 필드가 화면에 없어도 안전하게 지나간다', async () => {
    const { result } = renderHook(() => useAppForm(schema));

    await expect(act(async () => {
      result.current.applyServerErrors({
        response: { data: { errors: [{ field: 'notRendered', message: 'x' }] } },
      });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    })).resolves.toBeUndefined();
  });

  it('서버 필드 오류를 폼 필드에 귀속시키고 true 를 반환한다', () => {
    // react-hook-form 의 formState 는 Proxy 라, 렌더 중 접근한 키만 구독된다.
    // errors 를 렌더에서 읽지 않으면 setError 가 리렌더를 유발하지 않아 단언이 항상 undefined 가 된다.
    const { result } = renderHook(() => {
      const form = useAppForm(schema);
      void form.formState.errors;
      return form;
    });

    let handled = false;
    act(() => {
      // ⚠ 캐스팅 없이 호출한다 — 이것이 이 테스트의 본체다.
      handled = result.current.applyServerErrors({
        response: {
          data: {
            errors: [
              { field: 'pswd', message: '비밀번호는 8자 이상이어야 합니다.' },
              { field: 'emlAddr', message: '이메일 형식이 아닙니다.' },
            ],
          },
        },
      });
    });

    expect(handled).toBe(true);
    expect(result.current.formState.errors.pswd?.message).toBe('비밀번호는 8자 이상이어야 합니다.');
    expect(result.current.formState.errors.pswd?.type).toBe('server');
    expect(result.current.formState.errors.emlAddr?.message).toBe('이메일 형식이 아닙니다.');
  });

  it('서버 필드 오류를 연결해도 사용자가 입력한 값은 보존한다', () => {
    const { result } = renderHook(() => {
      const form = useAppForm(schema, {
        defaultValues: { pswd: 'Password1!', emlAddr: 'before@example.com' },
      });
      void form.formState.errors;
      return form;
    });

    act(() => {
      result.current.setValue('emlAddr', 'typed@example.com', { shouldDirty: true });
      result.current.applyServerErrors({
        fieldErrors: { emlAddr: '이미 등록된 이메일입니다.' },
      });
    });

    expect(result.current.getValues('emlAddr')).toBe('typed@example.com');
    expect(result.current.formState.errors.emlAddr?.message).toBe('이미 등록된 이메일입니다.');
  });

  it('같은 name을 가진 여러 폼에서는 제출한 폼 안의 오류 필드만 이동한다', async () => {
    function SameNameForms() {
      const first = useAppForm(schema, {
        defaultValues: { pswd: 'Password1!', emlAddr: 'first@example.com' },
      });
      const second = useAppForm(schema, {
        defaultValues: { pswd: 'Password1!', emlAddr: 'second@example.com' },
      });
      return (
        <>
          <form aria-label="첫 번째 폼" onSubmit={first.handleSubmit(() => undefined)}>
            <input aria-label="첫 이메일" {...first.register('emlAddr')} />
          </form>
          <form
            aria-label="두 번째 폼"
            onSubmit={second.handleSubmit(() => {
              second.applyServerErrors({ fieldErrors: { emlAddr: '두 번째 폼 오류' } });
            })}
          >
            <input aria-label="두 번째 이메일" {...second.register('emlAddr')} />
          </form>
        </>
      );
    }

    render(<SameNameForms />);
    const firstInput = screen.getByLabelText('첫 이메일');
    const secondInput = screen.getByLabelText('두 번째 이메일');
    firstInput.focus = vi.fn();
    secondInput.focus = vi.fn();
    secondInput.scrollIntoView = vi.fn();

    fireEvent.submit(screen.getByRole('form', { name: '두 번째 폼' }));

    await waitFor(() => expect(secondInput.focus).toHaveBeenCalledWith({ preventScroll: true }));
    expect(firstInput.focus).not.toHaveBeenCalled();
  });

  it('Server Action의 fieldErrors map도 같은 계약으로 소비한다', () => {
    const { result } = renderHook(() => {
      const form = useAppForm(schema);
      void form.formState.errors;
      return form;
    });

    let handled = false;
    act(() => {
      handled = result.current.applyServerErrors({
        success: false,
        message: '입력값을 확인해 주세요.',
        fieldErrors: {
          pswd: '서버 액션 비밀번호 오류',
          emlAddr: '서버 액션 이메일 오류',
        },
      });
    });

    expect(handled).toBe(true);
    expect(result.current.formState.errors.pswd?.message).toBe('서버 액션 비밀번호 오류');
    expect(result.current.formState.errors.emlAddr?.message).toBe('서버 액션 이메일 오류');
  });

  it('필드 오류가 아니면 false 를 반환해 호출부가 일반 오류로 처리하게 한다', () => {
    // react-hook-form 의 formState 는 Proxy 라, 렌더 중 접근한 키만 구독된다.
    // errors 를 렌더에서 읽지 않으면 setError 가 리렌더를 유발하지 않아 단언이 항상 undefined 가 된다.
    const { result } = renderHook(() => {
      const form = useAppForm(schema);
      void form.formState.errors;
      return form;
    });

    let handled = true;
    act(() => {
      handled = result.current.applyServerErrors(new Error('network down'));
    });

    expect(handled).toBe(false);
    expect(result.current.formState.errors.pswd).toBeUndefined();
  });
});

describe('useAppForm validation navigation', () => {
  beforeEach(() => {
    mocks.toastError.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('expected validation 실패를 console error 로 기록하지 않고 DOM 순서의 nested 오류로 이동한다', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const nestedSchema = z.object({
      pswd: z.string().min(8, '비밀번호 오류'),
      profile: z.object({
        emlAddr: z.string().email('이메일 오류'),
      }),
    });

    const email = document.createElement('input');
    email.name = 'profile.emlAddr';
    email.scrollIntoView = vi.fn();
    email.focus = vi.fn();
    const password = document.createElement('input');
    password.name = 'pswd';
    password.scrollIntoView = vi.fn();
    password.focus = vi.fn();
    // schema 순서는 pswd가 먼저지만 실제 화면에서는 email이 먼저다.
    document.body.append(email, password);

    const { result } = renderHook(() => useAppForm(nestedSchema, {
      defaultValues: { pswd: '', profile: { emlAddr: '' } },
    }));

    await act(async () => {
      await result.current.handleSubmit(vi.fn())();
    });

    await waitFor(() => expect(email.focus).toHaveBeenCalledTimes(1));
    expect(password.focus).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
    await waitFor(() => expect(document.querySelector('[data-form-error-announcer="true"]'))
      .toHaveTextContent('입력 오류 2개'));
  });

  it('검증 시작 전에 동기 잠금을 선점해 같은 tick의 중복 submit을 한 번만 실행한다', async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const onValid = vi.fn(() => pending);
    const { result } = renderHook(() => useAppForm(schema, {
      defaultValues: { pswd: 'Password1!', emlAddr: 'user@example.com' },
    }));
    const submit = result.current.handleSubmit(onValid);
    const firstEvent = new Event('submit', { cancelable: true });
    const duplicateEvent = new Event('submit', { cancelable: true });

    act(() => {
      void submit(firstEvent as unknown as Parameters<typeof submit>[0]);
      void submit(duplicateEvent as unknown as Parameters<typeof submit>[0]);
    });

    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
    expect(firstEvent.defaultPrevented).toBe(true);
    expect(duplicateEvent.defaultPrevented).toBe(true);
    await act(async () => release());
    await act(async () => submit());
    expect(onValid).toHaveBeenCalledTimes(2);
  });

  it('reduced motion 사용자는 smooth scroll 없이 오류 필드로 이동한다', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const input = document.createElement('input');
    input.name = 'pswd';
    input.scrollIntoView = vi.fn();
    input.focus = vi.fn();
    document.body.appendChild(input);
    const { result } = renderHook(() => useAppForm(schema));

    await act(async () => {
      await result.current.focusError('pswd');
    });

    expect(input.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('오류 target이 없으면 예외 없이 오류 요약으로 fallback 한다', async () => {
    const summary = document.createElement('div');
    summary.dataset.formErrorSummary = 'true';
    summary.tabIndex = -1;
    summary.focus = vi.fn();
    document.body.appendChild(summary);
    const { result } = renderHook(() => useAppForm(schema));

    let focused = true;
    await expect(act(async () => {
      focused = await result.current.focusError('notRendered');
    })).resolves.toBeUndefined();

    expect(focused).toBe(false);
    expect(summary.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('숨겨진 영역을 먼저 연 뒤 새로 렌더된 field로 이동한다', async () => {
    const input = document.createElement('input');
    input.name = 'pswd';
    input.scrollIntoView = vi.fn();
    input.focus = vi.fn();
    const revealField = vi.fn(async () => {
      document.body.appendChild(input);
    });
    const { result } = renderHook(() => useAppForm(schema, undefined, { revealField }));

    let focused = false;
    await act(async () => {
      focused = await result.current.focusError('pswd', 'server');
    });

    expect(revealField).toHaveBeenCalledWith('pswd', 'server');
    expect(focused).toBe(true);
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
