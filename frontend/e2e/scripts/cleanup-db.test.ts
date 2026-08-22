import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CLEANUP_STAGES,
  assertCleanupSucceeded,
  cleanup,
  recordCleanupFailure,
  type CleanupFailure,
} from './cleanup-db';

const safeFailure = (overrides: Partial<CleanupFailure> = {}): CleanupFailure => ({
  stage: 'cleanup',
  method: 'GET',
  pathCategory: 'polls-collection',
  status: 500,
  reasonCode: 'http-5xx',
  ...overrides,
});

describe('cleanup-db exit contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('실패가 없으면 정상 종료한다', () => {
    expect(() => assertCleanupSucceeded([])).not.toThrow();
  });

  it('failure stage는 bootstrap/auth/users/boards/cleanup의 닫힌 enum이다', () => {
    expect(CLEANUP_STAGES).toEqual(['bootstrap', 'auth', 'users', 'boards', 'cleanup']);
  });

  it('best-effort 실패를 모두 모은 뒤 AggregateError로 실패한다', () => {
    expect(() => assertCleanupSucceeded([
      safeFailure(),
      safeFailure({
        method: 'DELETE',
        pathCategory: 'banner-item',
        status: null,
        reasonCode: 'request-timeout',
      }),
    ])).toThrow(
      /2 cleanup operation\(s\) failed[\s\S]*stage=cleanup method=GET pathCategory=polls-collection status=500 reasonCode=http-5xx[\s\S]*stage=cleanup method=DELETE pathCategory=banner-item status=none reasonCode=request-timeout/,
    );
  });

  it('HTTP 실패의 stage/category/status만 기록하고 민감 원문은 로그와 예외에서 제거한다', () => {
    const rawMarkers = [
      'raw-server-message',
      'sensitive-query-value',
      'sensitive-request-body',
      'sensitive-bearer-value',
      'sensitive-user-id',
    ];
    const unsafeAxiosError = {
      isAxiosError: true,
      message: `raw-server-message sensitive-user-id`,
      config: {
        url: 'https://unsafe.invalid/api/v1/auth/login?key=sensitive-query-value',
        data: 'sensitive-request-body',
        headers: { Authorization: 'Bearer sensitive-bearer-value' },
      },
      response: {
        status: 401,
        data: { message: 'raw-server-message', userId: 'sensitive-user-id' },
      },
    };
    const failures: CleanupFailure[] = [];
    const warningLines: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((...values: unknown[]) => {
      warningLines.push(values.map(String).join(' '));
    });

    recordCleanupFailure(
      failures,
      { stage: 'auth', method: 'POST', pathCategory: 'auth-login' },
      unsafeAxiosError,
    );

    expect(failures).toEqual([{
      stage: 'auth',
      method: 'POST',
      pathCategory: 'auth-login',
      status: 401,
      reasonCode: 'http-4xx',
    }]);

    let aggregate: unknown;
    try {
      assertCleanupSucceeded(failures);
    } catch (error: unknown) {
      aggregate = error;
    }
    expect(aggregate).toBeInstanceOf(AggregateError);
    const observableOutput = JSON.stringify({
      failures,
      warningLines,
      aggregate: aggregate instanceof AggregateError
        ? { message: aggregate.message, errors: aggregate.errors.map(String) }
        : aggregate,
    });
    for (const marker of rawMarkers) {
      expect(observableOutput).not.toContain(marker);
    }
  });

  it('mutation 실패 직전에도 entity id와 오류 원문을 어떤 출력에도 남기지 않는다', async () => {
    const privateEntityMarker = 'user_private-entity-marker';
    const privateServerMarker = 'private-server-marker';
    const observableLines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...values: unknown[]) => {
      observableLines.push(values.map(String).join(' '));
    });
    vi.spyOn(console, 'warn').mockImplementation((...values: unknown[]) => {
      observableLines.push(values.map(String).join(' '));
    });
    vi.spyOn(console, 'error').mockImplementation((...values: unknown[]) => {
      observableLines.push(values.map(String).join(' '));
    });
    vi.spyOn(process.stdout, 'write').mockImplementation((value: string | Uint8Array) => {
      observableLines.push(String(value));
      return true;
    });
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { data: { accessToken: 'synthetic-test-token' } },
      headers: {},
    });
    vi.spyOn(axios, 'get').mockImplementation(async (url: string) => {
      if (url.endsWith('/users/me')) return { data: { data: {} }, headers: {} };
      if (url.endsWith('/admin/system/users')) {
        return { data: { data: { list: [{ userId: privateEntityMarker }] } }, headers: {} };
      }
      return { data: { data: { list: [] } }, headers: {} };
    });
    const deleteSpy = vi.spyOn(axios, 'delete').mockRejectedValue({
      isAxiosError: true,
      message: privateServerMarker,
      config: { url: `https://unsafe.invalid/${privateEntityMarker}` },
      response: { status: 409, data: { message: privateServerMarker } },
    });

    await expect(cleanup()).rejects.toThrow(
      /stage=users method=DELETE pathCategory=admin-user-item status=409 reasonCode=http-4xx/,
    );

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    const observableOutput = observableLines.join('\n');
    expect(observableOutput).not.toContain(privateEntityMarker);
    expect(observableOutput).not.toContain(privateServerMarker);
  });

  it('residue가 없으면 정해진 bootstrap/users/boards 순서 뒤에도 mutation을 만들지 않는다', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { data: { accessToken: 'synthetic-test-token' } },
      headers: {},
    });
    const getSpy = vi.spyOn(axios, 'get').mockImplementation(async (url: string) => {
      if (url.endsWith('/users/me')) {
        return { data: { data: {} }, headers: {} };
      }
      if (url.endsWith('/admin/system/menus/all')) {
        return { data: { data: [] }, headers: {} };
      }
      return { data: { data: { list: [] } }, headers: {} };
    });
    const deleteSpy = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { data: null } });

    await cleanup();

    expect(logSpy).toHaveBeenCalled();
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(getSpy.mock.invocationCallOrder[0]).toBeGreaterThan(postSpy.mock.invocationCallOrder[0]);
    expect(getSpy.mock.invocationCallOrder[1]).toBeGreaterThan(getSpy.mock.invocationCallOrder[0]);
    expect(getSpy.mock.invocationCallOrder[2]).toBeGreaterThan(getSpy.mock.invocationCallOrder[1]);
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
