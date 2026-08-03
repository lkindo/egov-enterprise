import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useAppForm } from '../useAppForm';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

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
