import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const nodeRequire = createRequire(import.meta.url);
const { runCoverageWorkflow } = nodeRequire('../../scripts/run-e2e-with-coverage.js') as {
  runCoverageWorkflow: (dependencies: Record<string, unknown>) => Promise<void>;
};

describe('run-e2e-with-coverage hard-failure contract', () => {
  it('Playwright 자식 실패를 report 생성 뒤에도 호출자에게 전파한다', async () => {
    const commands: string[] = [];
    const childFailure = new Error('playwright child exited 1');
    const kill = vi.fn();
    const stream = { on: vi.fn() };
    const execute = vi.fn((command: string) => {
      commands.push(command);
      if (command.includes('playwright test')) throw childFailure;
    });

    await expect(runCoverageWorkflow({
      execute,
      spawnProcess: () => ({
        pid: 4242,
        exitCode: null,
        stdout: stream,
        stderr: stream,
        kill,
      }),
      waitUntilReady: async () => undefined,
      loadEnvironment: () => undefined,
      platform: 'linux',
      logger: { log: vi.fn(), error: vi.fn() },
    })).rejects.toBe(childFailure);

    expect(kill).toHaveBeenCalledWith('SIGTERM');
    expect(commands).toContain('npm run coverage:report');
  });
});
