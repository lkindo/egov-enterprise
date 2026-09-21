import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import { collectPageCoverage, observePage } from './page-observation';

const guards = vi.hoisted(() => ({ install: vi.fn(), verify: vi.fn() }));
vi.mock('./error-detector', () => ({
  buildSpecScope: (file: string, title: string) => `${file} :: ${title}`,
  ConsoleErrorGuard: class { install = guards.install; verify = guards.verify; },
}));

describe('requested browser page observations', () => {
  afterEach(() => { vi.restoreAllMocks(); guards.install.mockReset(); guards.verify.mockReset(); });

  it('each requested actor page installs its guard and writes independent coverage', async () => {
    vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
    const write = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    const page = { evaluate: vi.fn().mockResolvedValue({ source: { s: { 1: 2 } } }) } as unknown as Page;
    const first = await observePage(page, { file: 'journeys/approvals.spec.ts', title: 'owner approves' });
    const second = await observePage(page, { file: 'journeys/approvals.spec.ts', title: 'approver checks' });
    await first.finish(); await second.finish();
    expect(guards.install).toHaveBeenCalledTimes(2);
    expect(guards.verify).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write.mock.calls[0][0]).not.toBe(write.mock.calls[1][0]);
  });

  it('an unexpected browser error is red and coverage is still persisted', async () => {
    vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
    const write = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    guards.verify.mockRejectedValue(new Error('unexpected browser error'));
    const page = { evaluate: vi.fn().mockResolvedValue({ source: {} }) } as unknown as Page;
    const observation = await observePage(page, { file: 'test.spec.ts', title: 'negative probe' });
    await expect(observation.finish()).rejects.toThrow('Browser observation failed');
    expect(write).toHaveBeenCalledOnce();
  });

  it('a closed realm has no coverage, while persistence failures stay red', async () => {
    const closedPage = { evaluate: vi.fn().mockRejectedValue(new Error('closed realm')) } as unknown as Page;
    await expect(collectPageCoverage(closedPage)).resolves.toBeUndefined();
    vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => { throw new Error('disk unavailable'); });
    const page = { evaluate: vi.fn().mockResolvedValue({ source: {} }) } as unknown as Page;
    await expect(collectPageCoverage(page)).rejects.toThrow('disk unavailable');
  });
});
