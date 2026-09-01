import axios from 'axios';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  deleteScrapOperation,
  downloadFileOperation,
  getMyScrapListOperation,
  getScrapOperation,
  changePasswordOperation,
  createCommentOperation,
  getCommentsOperation,
  type GeneratedOperationResponse,
} from '@/types/generated-operations';
import type { components } from '@/types/generated-api';
import {
  buildGeneratedOperationPath,
  parseGeneratedOperationQuery,
  parseGeneratedOperationRequest,
  parseGeneratedOperationResponse,
  validateGeneratedOperationConfig,
  type GeneratedOperationConfig,
  type GeneratedOperationArguments,
} from '@/lib/api/generated-operation';

describe('generated operation contract', () => {
  it('operationId와 HTTP 경로를 한 descriptor에 결속한다', () => {
    expect(getScrapOperation).toMatchObject({
      id: 'getScrap',
      method: 'get',
      path: '/api/v1/scraps/{scrapSn}',
      requestKind: 'none',
      responseKind: 'json',
    });
    expect(deleteScrapOperation.responseKind).toBe('void');
    expect(downloadFileOperation.responseKind).toBe('binary');
  });

  it('path parameter를 빠짐없이 URL encode한다', () => {
    expect(buildGeneratedOperationPath(getScrapOperation, { scrapSn: 42 })).toBe('scraps/42');
    expect(() => buildGeneratedOperationPath(getScrapOperation, {} as never)).toThrow(
      '생성 API 경로 파라미터가 OpenAPI 계약과 일치하지 않습니다.',
    );
  });

  it('query parameter의 이름과 정수 계약을 런타임에도 검증한다', () => {
    expect(parseGeneratedOperationQuery(getMyScrapListOperation, { pageIndex: 1, pageUnit: 20 }))
      .toEqual({ pageIndex: 1, pageUnit: 20 });
    expect(() => parseGeneratedOperationQuery(getMyScrapListOperation, { pageIndex: 1.5 })).toThrow();
    expect(() => parseGeneratedOperationQuery(getMyScrapListOperation, { page: 0 })).toThrow();
  });

  it('generated request Zod로 쓰기 요청을 fail-closed 검증한다', () => {
    expect(parseGeneratedOperationRequest(changePasswordOperation, {
      oldPassword: 'old-password',
      newPassword: 'new-password',
    })).toEqual({ oldPassword: 'old-password', newPassword: 'new-password' });

    expect(() => parseGeneratedOperationRequest(changePasswordOperation, {
      oldPassword: 'old-password',
    })).toThrow();
  });

  it('readOnly 요청 위조와 writeOnly 응답 유출을 중첩 경로까지 차단한다', () => {
    expect(() => parseGeneratedOperationRequest(createCommentOperation, {
      pstSn: 7,
      bbsId: 'BBSMSTR_A',
      ansCn: '댓글',
      wrterId: 'forged-writer',
    } as never)).toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');

    let thrown: unknown;
    try {
      parseGeneratedOperationResponse(getCommentsOperation, {
        success: true,
        code: 'S000',
        message: '성공',
        data: { list: [{ pswd: 'response-secret-marker' }] },
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('생성 API 응답에 허용되지 않은 필드가 있습니다.');
    expect((thrown as Error).message).not.toContain('response-secret-marker');
  });

  it('공통 envelope와 generated data Zod를 함께 검증한다', () => {
    const response = parseGeneratedOperationResponse(getScrapOperation, {
      success: true,
      code: 'S000',
      message: '성공',
      data: { scrapSn: 12, scrapNm: '문서', useYn: 'Y' },
    });
    expect(response).toMatchObject({ scrapSn: 12, scrapNm: '문서' });
    expect(() => parseGeneratedOperationResponse(getScrapOperation, {
      success: true,
      code: 'S000',
      message: '성공',
      data: { scrapSn: '12', useYn: 'Y' },
    })).toThrow();
    expect(() => parseGeneratedOperationResponse(getScrapOperation, {
      success: false,
      code: 'C001',
      message: '민감한 원문',
      data: null,
    })).toThrow('생성 API 응답 envelope가 성공 계약과 일치하지 않습니다.');
    expect(() => parseGeneratedOperationResponse(getScrapOperation, {
      data: { scrapSn: 12 },
    })).toThrow('생성 API 응답 envelope가 성공 계약과 일치하지 않습니다.');
  });

  it('void 응답도 envelope를 검증하고 binary만 envelope를 우회한다', () => {
    expect(parseGeneratedOperationResponse(deleteScrapOperation, {
      success: true,
      code: 'S000',
      message: '성공',
      data: null,
      timestamp: '2026-08-31T21:00:00',
    })).toBeUndefined();
    expect(() => parseGeneratedOperationResponse(deleteScrapOperation, {
      success: true,
      code: 'S000',
      message: '성공',
      data: null,
      timestamp: 'not-a-date',
    })).toThrow('생성 API void 응답이 OpenAPI 계약과 일치하지 않습니다.');
    expect(() => parseGeneratedOperationResponse(deleteScrapOperation, undefined)).toThrow(
      '생성 API 응답 envelope가 성공 계약과 일치하지 않습니다.',
    );
  });

  it('descriptor의 반환 타입은 generated-api operation 응답에서 유도한다', () => {
    expectTypeOf<GeneratedOperationResponse<typeof getScrapOperation>>()
      .toEqualTypeOf<NonNullable<components['schemas']['ScrapDto']>>();
    expectTypeOf<GeneratedOperationResponse<typeof deleteScrapOperation>>().toEqualTypeOf<void>();
    expectTypeOf<GeneratedOperationResponse<typeof downloadFileOperation>>().toEqualTypeOf<Blob>();
  });

  it('path/body 필수값과 transport-owned config를 타입·런타임에서 덮어쓸 수 없다', () => {
    const validPath: GeneratedOperationArguments<typeof getScrapOperation> = {
      path: { scrapSn: 1 },
    };
    const validBody: GeneratedOperationArguments<typeof changePasswordOperation> = {
      body: { oldPassword: 'old', newPassword: 'new' },
    };
    void validPath;
    void validBody;

    // @ts-expect-error path parameter가 있는 operation은 path가 필수다.
    const missingPath: GeneratedOperationArguments<typeof getScrapOperation> = {};
    // @ts-expect-error requestBody.required=true인 operation은 body가 필수다.
    const missingBody: GeneratedOperationArguments<typeof changePasswordOperation> = {};
    const overriddenUrl: GeneratedOperationArguments<typeof getScrapOperation> = {
      path: { scrapSn: 1 },
      // @ts-expect-error URL은 descriptor가 소유하므로 호출자가 config로 바꿀 수 없다.
      config: { url: '/other' },
    };
    void missingPath;
    void missingBody;
    void overriddenUrl;

    expect(() => validateGeneratedOperationConfig({ url: '/other' })).toThrow(
      '생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.',
    );
  });

  it('검증된 JSON body를 transformRequest로 위조할 수 없다', () => {
    const maliciousConfig = {
      transformRequest: [() => JSON.stringify({
        oldPassword: 'forged-old-password',
        newPassword: 'forged-new-password',
      })],
    };
    const typedConfig: GeneratedOperationConfig = {
      // @ts-expect-error request transform은 generated body 검증 뒤 wire를 바꾸므로 공개하지 않는다.
      transformRequest: maliciousConfig.transformRequest,
    };
    void typedConfig;

    expect(() => validateGeneratedOperationConfig(maliciousConfig)).toThrow(
      '생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.',
    );
  });

  it('검증된 query를 paramsSerializer로 다른 wire query로 바꿀 수 없다', () => {
    expect(() => validateGeneratedOperationConfig({
      paramsSerializer: () => 'pageIndex=999999&forged=true',
    })).toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
  });

  it('invalid response를 transformResponse로 generated Zod 앞에서 정상화할 수 없다', () => {
    expect(() => validateGeneratedOperationConfig({
      transformResponse: [() => ({
        success: true,
        code: 'S000',
        message: '성공',
        data: { scrapSn: 1, useYn: 'Y' },
      })],
    })).toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
  });

  it.each([
    ['adapter', vi.fn()],
    ['transport', vi.fn()],
    ['beforeRedirect', vi.fn()],
  ])('%s로 generated transport를 교체하거나 redirect wire를 변조할 수 없다', (key, hook) => {
    expect(() => validateGeneratedOperationConfig({ [key]: hook })).toThrow(
      '생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.',
    );
  });

  it('Content-Type은 operation transport가 소유하고 안전한 요청 제어 옵션은 보존한다', () => {
    expect(() => validateGeneratedOperationConfig({
      headers: { 'Content-Type': 'text/plain' },
    })).toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
    expect(() => validateGeneratedOperationConfig({
      headers: { post: { 'content-type': 'text/plain' } },
    })).toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
    expect(() => validateGeneratedOperationConfig({
      headers: { ' Content-Type\t': 'text/plain' },
    })).toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
    expect(() => validateGeneratedOperationConfig({
      headers: { common: { '\tcontent-type ': 'text/plain' } },
    })).toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');

    const controller = new AbortController();
    const cancelSource = axios.CancelToken.source();
    const onUploadProgress = vi.fn();
    const onDownloadProgress = vi.fn();
    const safeConfig: GeneratedOperationConfig = {
      headers: { Authorization: 'Bearer test-token', 'X-Trace-Id': 'trace-1' },
      timeout: 5_000,
      signal: controller.signal,
      cancelToken: cancelSource.token,
      onUploadProgress,
      onDownloadProgress,
      withCredentials: true,
      suppressErrorToast: true,
    };

    expect(validateGeneratedOperationConfig(safeConfig)).toEqual(safeConfig);
  });

  it('검증과 전송 사이에 config getter가 wire-owned header를 바꿀 수 없다', () => {
    let headerReads = 0;
    const changingConfig = Object.defineProperty({}, 'headers', {
      enumerable: true,
      get: () => {
        headerReads += 1;
        return headerReads === 1
          ? { Authorization: 'Bearer test-token' }
          : { 'Content-Type': 'text/plain' };
      },
    });

    const validated = validateGeneratedOperationConfig(changingConfig);

    expect(validated?.headers).toEqual({ Authorization: 'Bearer test-token' });
    expect(headerReads).toBe(1);
  });

  it('config와 header container 자체가 유효하지 않으면 transport 전에 fail-closed한다', () => {
    expect(validateGeneratedOperationConfig(undefined)).toBeUndefined();
    expect(validateGeneratedOperationConfig({ headers: undefined })).toEqual({ headers: undefined });
    for (const invalidConfig of [null, [], 'timeout=1']) {
      expect(() => validateGeneratedOperationConfig(invalidConfig)).toThrow(
        '생성 API 요청 설정이 유효하지 않습니다.',
      );
    }
    for (const invalidHeaders of [null, [], 'Authorization: forged']) {
      expect(() => validateGeneratedOperationConfig({ headers: invalidHeaders })).toThrow(
        '생성 API 요청 설정이 유효하지 않습니다.',
      );
    }
    for (const invalidMethodHeaders of [null, [], 'Content-Type: forged']) {
      expect(() => validateGeneratedOperationConfig({
        headers: { post: invalidMethodHeaders },
      })).toThrow('생성 API 요청 설정이 유효하지 않습니다.');
    }
  });

  it('AxiosHeaders와 method header group도 같은 Content-Type 소유권을 따른다', () => {
    expect(() => validateGeneratedOperationConfig({
      headers: new axios.AxiosHeaders({ 'Content-Type': 'application/json' }),
    })).toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');

    expect(validateGeneratedOperationConfig({
      headers: {
        common: { Authorization: 'Bearer common-token' },
        post: { 'X-Trace-Id': 'trace-1' },
        delete: undefined,
      },
    })?.headers).toEqual({
      common: { Authorization: 'Bearer common-token' },
      post: { 'X-Trace-Id': 'trace-1' },
      delete: undefined,
    });
  });
});
