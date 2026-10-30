import axios from 'axios';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  deleteDeptJobOperation,
  downloadFileOperation,
  getDeptJobListOperation,
  getDeptJobOperation,
  changePasswordOperation,
  createDeptJobOperation,
  getUserOperation,
  getUsersOperation,
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

/*
 * 예시 서술자는 core 업무(부서 업무·사용자·파일·비밀번호 변경)다 — 생성물은 생성 계약(api-docs → 생성 서술자·Zod·타입)을 구성으로
 * 줄이므로(Phase 2 10단계 10c) 스크랩·댓글 서술자를 쓰면 그 기능이 빠진 구성에서 이 시험이 사라진 이름을 import 한다. 서술자 실행기
 * 계약은 모든 구성에 있으므로 모든 구성에서 같은 뜻으로 돈다.
 */
describe('generated operation contract', () => {
  it('operationId와 HTTP 경로를 한 descriptor에 결속한다', () => {
    expect(getDeptJobOperation).toMatchObject({
      id: 'getDeptJob',
      method: 'get',
      path: '/api/v1/dept-jobs/{deptTaskSn}',
      requestKind: 'none',
      responseKind: 'json',
    });
    expect(deleteDeptJobOperation.responseKind).toBe('void');
    expect(downloadFileOperation.responseKind).toBe('binary');
  });

  it('path parameter를 빠짐없이 URL encode한다', () => {
    expect(buildGeneratedOperationPath(getDeptJobOperation, { deptTaskSn: 42 })).toBe('dept-jobs/42');
    expect(() => buildGeneratedOperationPath(getDeptJobOperation, {} as never)).toThrow(
      '생성 API 경로 파라미터가 OpenAPI 계약과 일치하지 않습니다.',
    );
  });

  it('query parameter의 이름과 정수 계약을 런타임에도 검증한다', () => {
    expect(parseGeneratedOperationQuery(getDeptJobListOperation, { page: 1, size: 20 }))
      .toEqual({ page: 1, size: 20 });
    expect(() => parseGeneratedOperationQuery(getDeptJobListOperation, { page: 1.5 })).toThrow();
    // [ADR-0036] page 는 1부터다 — 0 기반 호출과 옛 이름(pageIndex)은 요청 전에 막힌다.
    expect(() => parseGeneratedOperationQuery(getDeptJobListOperation, { page: 0 })).toThrow();
    expect(() => parseGeneratedOperationQuery(getDeptJobListOperation, { pageIndex: 1 })).toThrow();
  });

  it('generated request Zod로 쓰기 요청을 fail-closed 검증한다', () => {
    expect(parseGeneratedOperationRequest(changePasswordOperation, {
      oldPassword: 'old-password',
      newPassword: 'New-password1!',
    })).toEqual({ oldPassword: 'old-password', newPassword: 'New-password1!' });

    expect(() => parseGeneratedOperationRequest(changePasswordOperation, {
      oldPassword: 'old-password',
    })).toThrow();
  });

  it('readOnly 요청 위조와 writeOnly 응답 유출을 중첩 경로까지 차단한다', () => {
    // 입력 전용 DeptJobSaveRequest에는 서버 판정 editable이 없다 — 실제 요청에서는 알 수 없는 필드로 거부한다.
    expect(() => parseGeneratedOperationRequest(createDeptJobOperation, {
      deptTaskNm: '업무',
      deptTaskCn: '내용',
      editable: true,
    } as never)).toThrow('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');

    // 실행기의 readOnly 경로 차단도 유지한다. 아래 중첩 writeOnly 사례처럼 같은 형식의 경로를 서술자에 얹는다.
    expect(() => parseGeneratedOperationRequest({
      ...createDeptJobOperation,
      requestForbiddenPaths: [['editable']],
    }, {
      deptTaskNm: '업무',
      deptTaskCn: '내용',
      editable: true,
    })).toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');

    // 계약에 없는 작성자 ID도 strict 요청 계약이 거부한다(작성자는 서버가 인증 주체로 정한다).
    expect(() => parseGeneratedOperationRequest(createDeptJobOperation, {
      deptTaskNm: '업무',
      deptTaskCn: '내용',
      wrterId: 'forged-writer',
    } as never)).toThrow('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');

    // 생성 서술자가 싣는 writeOnly 경로 — 사용자 상세(UserDto)의 비밀번호는 응답에 나오면 유출이다.
    expect(getUserOperation.responseForbiddenPaths).toContainEqual(['pswd']);
    const leak = (descriptor: typeof getUserOperation | typeof getUsersOperation, data: unknown): Error => {
      try {
        parseGeneratedOperationResponse(descriptor, { success: true, code: 'S000', message: '성공', data });
      } catch (error) {
        return error as Error;
      }
      throw new Error('응답 유출을 거부하지 않았다');
    };
    const direct = leak(getUserOperation, { userId: 'u1', userNm: '사용자', pswd: 'response-secret-marker' });
    expect(direct.message).toBe('생성 API 응답에 허용되지 않은 필드가 있습니다.');
    expect(direct.message).not.toContain('response-secret-marker');

    // 중첩 경로(목록의 각 행) — [2026-10-19] 사용자 목록은 쓰기 전용 필드가 없는 목록 전용 응답(UserListItemDto)이 되어
    //   core 서술자 가운데 중첩 writeOnly 경로를 생성으로 갖는 것이 없다(게시판·댓글·메일·대시보드는 선택 기능이라 쓰지 않는다).
    //   실행기의 '*' 경로 판정은 목록 서술자에 같은 형식의 경로를 얹어 확인한다.
    const nested = leak(
      { ...getUsersOperation, responseForbiddenPaths: [['list', '*', 'pswd']] } as typeof getUsersOperation,
      { list: [{ userId: 'u1', userNm: '사용자', groups: [], permissions: [], authorizationVersion: 'v', pswd: 'response-secret-marker' }] },
    );
    expect(nested.message).toBe('생성 API 응답에 허용되지 않은 필드가 있습니다.');
    expect(nested.message).not.toContain('response-secret-marker');
  });

  it('공통 envelope와 generated data Zod를 함께 검증한다', () => {
    const response = parseGeneratedOperationResponse(getDeptJobOperation, {
      success: true,
      code: 'S000',
      message: '성공',
      data: { deptTaskSn: 12, deptTaskNm: '문서' },
    });
    expect(response).toMatchObject({ deptTaskSn: 12, deptTaskNm: '문서' });
    expect(() => parseGeneratedOperationResponse(getDeptJobOperation, {
      success: true,
      code: 'S000',
      message: '성공',
      data: { deptTaskSn: '12', deptTaskNm: '문서' },
    })).toThrow();
    expect(() => parseGeneratedOperationResponse(getDeptJobOperation, {
      success: false,
      code: 'C001',
      message: '민감한 원문',
      data: null,
    })).toThrow('생성 API 응답 envelope가 성공 계약과 일치하지 않습니다.');
    expect(() => parseGeneratedOperationResponse(getDeptJobOperation, {
      data: { deptTaskSn: 12 },
    })).toThrow('생성 API 응답 envelope가 성공 계약과 일치하지 않습니다.');
  });

  it('void 응답도 envelope를 검증하고 binary만 envelope를 우회한다', () => {
    expect(parseGeneratedOperationResponse(deleteDeptJobOperation, {
      success: true,
      code: 'S000',
      message: '성공',
      data: null,
      timestamp: '2026-08-31T21:00:00',
    })).toBeUndefined();
    expect(() => parseGeneratedOperationResponse(deleteDeptJobOperation, {
      success: true,
      code: 'S000',
      message: '성공',
      data: null,
      timestamp: 'not-a-date',
    })).toThrow('생성 API void 응답이 OpenAPI 계약과 일치하지 않습니다.');
    expect(() => parseGeneratedOperationResponse(deleteDeptJobOperation, undefined)).toThrow(
      '생성 API 응답 envelope가 성공 계약과 일치하지 않습니다.',
    );
  });

  it('descriptor의 반환 타입은 generated-api operation 응답에서 유도한다', () => {
    expectTypeOf<GeneratedOperationResponse<typeof getDeptJobOperation>>()
      .toEqualTypeOf<NonNullable<components['schemas']['DeptJobDto']>>();
    expectTypeOf<GeneratedOperationResponse<typeof deleteDeptJobOperation>>().toEqualTypeOf<void>();
    expectTypeOf<GeneratedOperationResponse<typeof downloadFileOperation>>().toEqualTypeOf<Blob>();
  });

  it('path/body 필수값과 transport-owned config를 타입·런타임에서 덮어쓸 수 없다', () => {
    const validPath: GeneratedOperationArguments<typeof getDeptJobOperation> = {
      path: { deptTaskSn: 1 },
    };
    const validBody: GeneratedOperationArguments<typeof changePasswordOperation> = {
      body: { oldPassword: 'old', newPassword: 'new' },
    };
    void validPath;
    void validBody;

    // @ts-expect-error path parameter가 있는 operation은 path가 필수다.
    const missingPath: GeneratedOperationArguments<typeof getDeptJobOperation> = {};
    // @ts-expect-error requestBody.required=true인 operation은 body가 필수다.
    const missingBody: GeneratedOperationArguments<typeof changePasswordOperation> = {};
    const overriddenUrl: GeneratedOperationArguments<typeof getDeptJobOperation> = {
      path: { deptTaskSn: 1 },
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
        data: { deptTaskSn: 1 },
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
