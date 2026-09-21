import type { Page, TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildSpecScope, ConsoleErrorGuard } from './error-detector';

export async function collectPageCoverage(page: Page): Promise<void> {
  // A redirect/closed page can have no JS realm. File write failures still fail the run.
  const coverage = await page.evaluate(() => (window as Window & { __coverage__?: unknown }).__coverage__)
    .catch(() => undefined);
  if (coverage) {
    const directory = path.join(process.cwd(), '.nyc_output');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, `playwright_${crypto.randomUUID()}.json`), JSON.stringify(coverage), 'utf8');
  }
}
export async function observePage(page: Page, testInfo: Pick<TestInfo, 'file' | 'title'>) {
  const guard = new ConsoleErrorGuard(page, buildSpecScope(testInfo.file, testInfo.title));
  await guard.install();
  return { guard, async finish() {
    const outcomes = await Promise.allSettled([collectPageCoverage(page), guard.verify()]);
    const failures = outcomes.filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');
    if (failures.length) throw new AggregateError(failures.map(outcome => outcome.reason), 'Browser observation failed.');
  } };
}
