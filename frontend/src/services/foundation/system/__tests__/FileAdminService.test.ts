import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosRequestConfig } from 'axios';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { fileAdminService } from '../FileAdminService';

const success = <T,>(data: T) => ({
  success: true as const,
  code: 'S000',
  message: '성공',
  data,
});

const makeFile = (name: string, type = 'text/plain'): File =>
  new File([`${name} contents`], name, { type });

interface MultipartRequest {
  url: string;
  method: string;
  data: FormData;
  headers?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}

function requestAt(callIndex: number): MultipartRequest {
  const request = client.requestRaw.mock.calls[callIndex]?.[0] as Record<string, unknown> | undefined;
  if (!request || !(request.data instanceof FormData)) {
    throw new Error(`${callIndex}번째 generated multipart 요청이 FormData가 아닙니다.`);
  }
  return request as unknown as MultipartRequest;
}

function fileParts(formData: FormData): File[] {
  return formData.getAll('files').map((entry) => {
    if (!(entry instanceof File)) throw new Error('files part가 File이 아닙니다.');
    return entry;
  });
}

describe('FileAdminService generated multipart contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.requestRaw.mockResolvedValue(success(101));
  });

  it('uploadFiles_1Operation의 exact 관리자 경로와 POST 동사를 사용한다', async () => {
    await fileAdminService.uploadFiles([makeFile('a.txt')]);

    expect(requestAt(0)).toMatchObject({
      url: 'admin/system/files',
      method: 'post',
    });
    expect(client.post).not.toHaveBeenCalled();
  });

  it("모든 파일을 동일한 'files' part에 순서대로 append하고 raw File identity를 보존한다", async () => {
    const first = makeFile('a.txt');
    const second = makeFile('b.png', 'image/png');

    await fileAdminService.uploadFiles([first, second]);

    const body = requestAt(0).data;
    expect(body.has('file')).toBe(false);
    expect(body.has('files[0]')).toBe(false);
    expect(fileParts(body)).toStrictEqual([first, second]);
    expect(fileParts(body)[1].type).toBe('image/png');
  });

  it('호출마다 새 FormData를 만들고 필수 복수 part의 빈 배열은 transport 전에 거부한다', async () => {
    await fileAdminService.uploadFiles([makeFile('first.txt')]);
    await expect(fileAdminService.uploadFiles([])).rejects.toThrow(
      '생성 API multipart 요청이 OpenAPI part 계약과 일치하지 않습니다.',
    );

    expect(client.requestRaw).toHaveBeenCalledTimes(1);
  });

  it('Authorization·timeout·signal config를 보존하면서 Content-Type을 수동 주입하지 않는다', async () => {
    const { signal } = new AbortController();

    await fileAdminService.uploadFiles([makeFile('big.zip')], {
      timeout: 120000,
      signal,
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(requestAt(0)).toMatchObject({
      timeout: 120000,
      signal,
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(requestAt(0).headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'Content-Type': undefined,
    });
  });

  it('호출부가 manual Content-Type을 지정하면 transport 전에 fail-closed한다', async () => {
    await expect(fileAdminService.uploadFiles([makeFile('a.txt')], {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).rejects.toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');

    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('호출부 config 객체와 File을 변형하지 않는다', async () => {
    const file = makeFile('a.txt');
    const config: AxiosRequestConfig = {
      timeout: 30000,
      headers: { Authorization: 'Bearer test-token' },
    };

    await fileAdminService.uploadFiles([file], config);

    expect(config).toEqual({ timeout: 30000, headers: { Authorization: 'Bearer test-token' } });
    expect(fileParts(requestAt(0).data)[0]).toBe(file);
  });

  it('generated JSON response의 숫자 식별자를 가공 없이 반환한다', async () => {
    client.requestRaw.mockResolvedValueOnce(success(0));

    await expect(fileAdminService.uploadFiles([makeFile('a.txt')])).resolves.toBe(0);
  });

  it('malformed response와 transport 오류를 성공으로 위장하지 않는다', async () => {
    client.requestRaw.mockResolvedValueOnce(success('101'));
    await expect(fileAdminService.uploadFiles([makeFile('a.txt')])).rejects.toThrow(
      '생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.',
    );

    const failure = new Error('허용 용량을 초과했습니다');
    client.requestRaw.mockRejectedValueOnce(failure);
    await expect(fileAdminService.uploadFiles([makeFile('big.zip')])).rejects.toBe(failure);
  });

  it('서비스 표면은 uploadFiles 하나뿐이다', () => {
    const prototype: object = Object.getPrototypeOf(fileAdminService);
    expect(Object.getOwnPropertyNames(prototype).sort()).toEqual(['constructor', 'uploadFiles']);
  });
});
