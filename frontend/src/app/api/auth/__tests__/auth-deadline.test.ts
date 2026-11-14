// @vitest-environment node
import { createServer } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { http, passthrough } from 'msw';
import { server as mockServer } from '@/mocks/server';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it('ends a continuously trickling logout response and expires local cookies', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write('{');
    const timer = setInterval(() => response.write(' '), 100);
    response.on('close', () => clearInterval(timer));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test listener');
  vi.stubEnv('BACKEND_API_URL', `http://127.0.0.1:${address.port}/api/v1`);
  mockServer.use(http.post(`http://127.0.0.1:${address.port}/api/v1/auth/logout`, () => passthrough()));
  vi.resetModules();
  try {
    const { POST } = await import('../logout/route');
    const started = performance.now();
    const response = await POST(new NextRequest('https://example.test/api/auth/logout', { method: 'POST' }));
    expect(performance.now() - started).toBeLessThan(19_000);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { cleared: true } });
    for (const name of ['accessToken', 'refreshToken', 'session_exp', 'mfa_challenge', 'mfa_reauth']) {
      expect(response.headers.getSetCookie()).toContainEqual(expect.stringMatching(new RegExp(`^${name}=;.*Expires=Thu, 01 Jan 1970`, 'i')));
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}, 22_000);
