import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { logErrorSafely, summarizeError } from '../safe-error-log';
import { keepInProjection } from '@/test-utils/projection';

/**
 * 검색어가 서버 로그로 새는 경로를 막는다.
 *
 * ⚠ `console.error('...', error)` 로 axios 오류를 통째로 넘기면 그 객체의 `config.params` 가
 *   그대로 출력된다. 이 저장소에는 그 params 에 **사용자가 타이핑한 검색어** 가 실리는 경로가
 *   있다 — 게시판 목록의 `searchWrd`(작성자 검색이면 사람 이름), 사용자 선택기의 임직원 성명
 *   부분일치, 주소록 검색어.
 *
 *   ADR-0009의 URL 허용은 로그·분석 허용이 아니다. 이 계약은 **저장소 안의 같은 유출 경로를
 *   계속 차단한다**(2026-09-05 실측).
 */
describe('summarizeError — 요청 파라미터를 담지 않는다', () => {
  const axiosLike = {
    message: 'Request failed with status code 500',
    code: 'ERR_BAD_RESPONSE',
    config: {
      url: '/api/v1/boards/BBSMSTR_000000000001/posts',
      params: { searchCnd: '2', searchWrd: '홍길동', page: 1 },
      headers: { Authorization: 'Bearer secret-token' },
    },
    response: { status: 500, data: { code: 'INTERNAL_ERROR', message: '서버 오류' } },
  };

  it('진단에 필요한 최소치만 남긴다', () => {
    expect(summarizeError(axiosLike)).toEqual({
      message: 'Request failed with status code 500',
      status: 500,
      code: 'INTERNAL_ERROR',
    });
  });

  it('직렬화 결과에 검색어·토큰·URL 이 없다 — 이 테스트가 이 파일의 존재 이유다', () => {
    const serialized = JSON.stringify(summarizeError(axiosLike));
    for (const secret of ['홍길동', 'searchWrd', 'searchCnd', 'Bearer', 'secret-token', 'BBSMSTR']) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('평범한 Error 도 안전하게 다룬다', () => {
    expect(summarizeError(new Error('boom'))).toEqual({ message: 'boom' });
  });

  it('오류가 아닌 값도 던지지 않는다', () => {
    expect(summarizeError('문자열')).toEqual({ message: '문자열' });
    expect(summarizeError(null)).toEqual({ message: 'null' });
    expect(summarizeError(undefined)).toEqual({ message: 'undefined' });
  });

  it('logErrorSafely 는 원본 오류를 콘솔에 넘기지 않는다', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logErrorSafely('실패', axiosLike);

    expect(spy).toHaveBeenCalledTimes(1);
    const [, payload] = spy.mock.calls[0];
    expect(JSON.stringify(payload)).not.toContain('홍길동');
    expect(payload).not.toBe(axiosLike);
    spy.mockRestore();
  });

  afterEach(() => { vi.restoreAllMocks(); });
});

/**
 * ⚠ 검색어나 Bearer 자격을 나르는 일곱 파일이 다시 원본 오류를 로그로 넘기지 못하게 고정한다.
 *   전면 금지가 아니라 **이 목록만** 고정한다 — 나머지 로그 지점은 사용자 입력을 담지 않아
 *   같은 근거가 없다(AGENTS H4: 같은 문법이 같은 의미를 뜻하지 않는다).
 */
describe('검색어를 나르는 호출부는 안전 로깅을 쓴다', () => {
  const ROOT = resolve(__dirname, '..', '..');
  const RAW_CONSOLE_CALL = /console\.(?:error|warn|info|log|debug)\s*\(/u;
  // 선택하지 않은 기능의 파일은 생성물에서 투영으로 빠진다 — 원장에 있고 실제로 없는 파일만 뺀다(원본에서는 그대로다).
  const SITES = keepInProjection([
    'app/admin/community/boards/select-board-list/BoardListServer.ts',
    'app/admin/collaboration/address-book/select-address-book-list/AddressBookListClient.tsx',
    'app/admin/collaboration/address-book/select-address-book-list/AddressBookListServer.ts',
    'app/admin/system/codes/institution/page.tsx',
    'app/admin/system/codes/administ/page.tsx',
    'app/components/ui/user-picker.tsx',
    'app/components/ui/code-picker.tsx',
  ], relative => resolve(ROOT, relative));

  it.each(SITES)('%s 가 오류 객체를 통째로 console 에 넘기지 않는다', (relative) => {
    const source = readFileSync(resolve(ROOT, relative), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//gu, ' ')
      .replace(/\/\/.*$/gmu, ' ');

    expect(source).toMatch(/logErrorSafely\(/u);
    // 변수명·인자 형태로 우회하지 못하게 이 민감 호출부에서는 raw console 자체를 금지한다.
    expect(source).not.toMatch(RAW_CONSOLE_CALL);
  });

  it('원본 오류 변수명을 바꿔도 raw console 우회가 되지 않는다', () => {
    expect(RAW_CONSOLE_CALL.test("catch (failure) { console.warn('failed', failure); }")).toBe(true);
  });
});

/**
 * [2026-09-30] 과업별 기본 문구가 실제로 쓰이는가.
 * 종전 호출부는 `error instanceof Error ? error.message : '<기본 문구>'` 였다 — axios 오류는 언제나 Error 라서
 * 기본 문구가 한 번도 쓰이지 않았다.
 */
describe('failureMessage', () => {
  it('서버가 준 사유가 있으면 그것을 쓴다', async () => {
    const { failureMessage } = await import('../safe-error-log');
    const error = Object.assign(new Error('Request failed with status code 409'), {
      isAxiosError: true,
      response: { status: 409, data: { message: '이미 처리된 결재입니다.' } },
    });
    expect(failureMessage(error, '결재를 승인하지 못했습니다.')).toBe('이미 처리된 결재입니다.');
  });

  it('전송 원문뿐인 실패는 과업별 기본 문구로 말한다', async () => {
    const { failureMessage } = await import('../safe-error-log');
    const network = Object.assign(new Error('Network Error'), { isAxiosError: true });
    expect(failureMessage(network, '계정 잠금을 해제하지 못했습니다.')).toBe('계정 잠금을 해제하지 못했습니다.');
    expect(failureMessage(new Error('Request failed with status code 500'), '저장하지 못했습니다.')).toBe('저장하지 못했습니다.');
    expect(failureMessage(undefined, '저장하지 못했습니다.')).toBe('저장하지 못했습니다.');
  });

  it('화면 코드가 던진 한국어 오류는 그대로 쓴다', async () => {
    const { failureMessage } = await import('../safe-error-log');
    expect(failureMessage(new Error('응답 형식이 올바르지 않습니다.'), '불러오지 못했습니다.')).toBe('응답 형식이 올바르지 않습니다.');
  });
});
