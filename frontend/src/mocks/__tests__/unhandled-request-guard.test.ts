import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { takeUnhandledRequests } from '../unhandled-requests';

/*
 * [2026-10-26] 시험의 네트워크 격리(vitest.setup.ts). 핸들러 없는 요청은 실제 서버에 닿지 않고, 수집기가 기록해 시험이 끝날 때 실패로
 * 올린다. 'warn' 으로 되돌리면 아래 서버가 요청을 받고, 수집기를 빼면 기록이 비어 붉어진다.
 */
describe('핸들러 없는 요청', () => {
  let server: http.Server | null = null;

  afterEach(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  });

  it('실제 네트워크로 나가지 않고 기록된다', async () => {
    let hits = 0;
    server = http.createServer((_request, response) => {
      hits += 1;
      response.end('{}');
    });
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/unregistered-fixture`;

    await expect(fetch(url)).rejects.toThrow();

    expect(hits).toBe(0);
    // 기록을 이 시험이 비운다 — 공용 afterEach 가 이 의도된 요청을 실패로 올리지 않게 한다. 기록에는 출처 시험 이름이 붙는다.
    expect(takeUnhandledRequests()).toEqual([`GET ${url} (시험: 핸들러 없는 요청 > 실제 네트워크로 나가지 않고 기록된다)`]);
  });
});
