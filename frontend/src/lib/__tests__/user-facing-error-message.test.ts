import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { userFacingErrorMessage } from '../safe-error-log';

/**
 * [2026-09-15 DEC-OPS-100] 사용자에게 보여 줄 오류 문장의 단일 규칙.
 *
 * 오류 패널·Server Action·토스트가 이 함수 하나를 쓴다. axios 의 transport 원문은 사용자 문장이 아니고
 * (콘텐츠 가이드 §5, ADR-0002), 서버가 준 문구만 그대로 보여 준다.
 */
describe('userFacingErrorMessage', () => {
  it('서버 문구가 없는 axios 오류는 transport 원문을 버린다', () => {
    expect(userFacingErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toBeUndefined();
    expect(userFacingErrorMessage(new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED'))).toBeUndefined();
  });

  it('직렬화돼 평범한 객체가 된 axios 오류도 원문을 버린다', () => {
    expect(userFacingErrorMessage({ isAxiosError: true, message: 'Request failed with status code 500' })).toBeUndefined();
  });

  it('서버가 준 문구는 axios 오류든 평범한 객체든 그대로 쓴다', () => {
    const axiosError = new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', undefined, undefined,
      { status: 400, data: { message: '제목을 입력해주세요.' } } as never);
    expect(userFacingErrorMessage(axiosError)).toBe('제목을 입력해주세요.');
    expect(userFacingErrorMessage({ response: { data: { message: ' 권한이 없습니다. ' } } })).toBe('권한이 없습니다.');
  });

  it('axios 가 아닌 오류와 문자열은 그대로 쓰고, 비어 있거나 형태가 다르면 undefined 다', () => {
    expect(userFacingErrorMessage(new Error('알림을 불러오지 못했습니다.'))).toBe('알림을 불러오지 못했습니다.');
    expect(userFacingErrorMessage('목록을 불러오지 못했습니다.')).toBe('목록을 불러오지 못했습니다.');
    expect(userFacingErrorMessage('   ')).toBeUndefined();
    expect(userFacingErrorMessage(null)).toBeUndefined();
    expect(userFacingErrorMessage(42)).toBeUndefined();
  });
});
