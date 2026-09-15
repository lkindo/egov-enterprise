import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { extractErrorMessage } from '../actionUtils';

/**
 * [2026-09-15 DEC-OPS-100] Server Action 이 돌려주는 오류 문장은 화면 토스트에 그대로 뜬다.
 * 서버 문구가 없는 axios 오류의 transport 원문을 돌려주면 사용자가 영어 원문을 보게 된다.
 */
describe('extractErrorMessage (Server Action)', () => {
  it('서버 문구가 없는 axios 오류는 과업별 안내로 바꾼다 — transport 원문을 돌려주지 않는다', () => {
    expect(extractErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'), '코드를 저장하지 못했습니다.'))
      .toBe('코드를 저장하지 못했습니다.');
    expect(extractErrorMessage(new AxiosError('Request failed with status code 500', 'ERR_BAD_RESPONSE', undefined, undefined,
      { status: 500, data: {} } as never), '코드를 저장하지 못했습니다.'))
      .toBe('코드를 저장하지 못했습니다.');
  });

  it('서버가 준 문구는 그대로 돌려준다', () => {
    const error = new AxiosError('Request failed with status code 409', 'ERR_BAD_REQUEST', undefined, undefined,
      { status: 409, data: { message: '이미 사용 중인 코드입니다.' } } as never);
    expect(extractErrorMessage(error, '코드를 저장하지 못했습니다.')).toBe('이미 사용 중인 코드입니다.');
  });

  it('axios 가 아닌 오류는 그 문구를, 아무것도 없으면 기본 안내를 쓴다', () => {
    expect(extractErrorMessage(new Error('저장에 실패했습니다.'))).toBe('저장에 실패했습니다.');
    expect(extractErrorMessage(undefined)).toBe('오류가 발생했습니다.');
  });
});
