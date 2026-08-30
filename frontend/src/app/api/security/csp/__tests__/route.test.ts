import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ENDPOINT = 'http://localhost:3001/api/security/csp';
const TYPE = 'application/csp-report';

function reportBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    'csp-report': {
      'effective-directive': 'script-src-elem',
      'blocked-uri': 'https://cdn.example/app.js',
      'document-uri': 'https://app.example/admin',
      ...overrides,
    },
  });
}

function post(body: BodyInit, headers: Record<string, string> = {}) {
  return new NextRequest(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': TYPE, ...headers },
    body,
  });
}

describe('POST /api/security/csp', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('Content-Length 초과는 body stream을 읽기 전에 413으로 거부한다', async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode(reportBody()));
        controller.close();
      },
    });
    const request = post(stream, { 'content-length': String(32 * 1024 + 1) });
    const { POST } = await import('../route');

    const response = await POST(request);

    expect(response.status).toBe(413);
  });

  it('Content-Length가 없어도 실제 byte stream을 상한에서 중단한다', async () => {
    const request = post('A'.repeat(32 * 1024 + 1));
    const { POST } = await import('../route');

    const response = await POST(request);

    expect(response.status).toBe(413);
  });

  it('한 요청의 report 개수를 제한하고 하나도 로깅하지 않는다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reports = Array.from({ length: 11 }, () => ({
      body: { 'effective-directive': 'script-src', 'document-uri': 'https://app.example/' },
    }));
    const { POST } = await import('../route');

    const response = await POST(post(JSON.stringify(reports), { 'content-type': 'application/reports+json' }));

    expect(response.status).toBe(413);
    expect(warn).not.toHaveBeenCalled();
  });

  it('URL query·fragment와 script sample은 로그에 기록하지 않는다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { POST } = await import('../route');

    const response = await POST(post(reportBody({
      'blocked-uri': 'https://cdn.example/app.js?signature=blocked-secret#fragment',
      'document-uri': 'https://app.example/admin?token=document-secret#section',
      'script-sample': 'sample-secret()',
    })));

    expect(response.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = String(warn.mock.calls[0]?.[1]);
    expect(logged).toContain('https://cdn.example/app.js');
    expect(logged).toContain('https://app.example/admin');
    expect(logged).not.toContain('blocked-secret');
    expect(logged).not.toContain('document-secret');
    expect(logged).not.toContain('fragment');
    expect(logged).not.toContain('sample-secret');
    expect(logged).not.toContain('sample');
  });

  it('프로세스 로컬 window를 넘으면 429와 Retry-After를 반환한다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { POST } = await import('../route');

    const responses = [];
    for (let index = 0; index < 31; index += 1) {
      responses.push(await POST(post(reportBody())));
    }

    expect(responses.slice(0, 30).every((response) => response.status === 204)).toBe(true);
    expect(responses[30]?.status).toBe(429);
    expect(responses[30]?.headers.get('retry-after')).toBe('60');
  });
});
