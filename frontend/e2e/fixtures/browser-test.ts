import { type BrowserContext, type BrowserContextOptions, type Page } from '@playwright/test';
import { test as apiTest } from './api-test';
import { BoardMasterPage } from '../pages/BoardMasterPage';
import { SecurityAdminPage } from '../pages/SecurityAdminPage';
import { CollabPage } from '../pages/CollabPage';
import { StatsPage } from '../pages/StatsPage';
import { OpsDetailPage } from '../pages/OpsDetailPage';
import { OperationalExtensionPage } from '../pages/OperationalExtensionPage';
import { BusinessExtensionPage } from '../pages/BusinessExtensionPage';
import { ConsoleErrorGuard } from './error-detector';
import { observePage } from './page-observation';

type Actor = { context: BrowserContext; page: Page; guard: ConsoleErrorGuard };
type BrowserFixtures = {
  boardMasterPage: BoardMasterPage; securityAdminPage: SecurityAdminPage; collabPage: CollabPage;
  statsPage: StatsPage; opsDetailPage: OpsDetailPage; operationalPage: OperationalExtensionPage;
  businessPage: BusinessExtensionPage; consoleGuard: ConsoleErrorGuard;
  actorPage: (options?: BrowserContextOptions) => Promise<Actor>; adminPage: Page; userPage: Page;
};
const pageGuards = new WeakMap<Page, ConsoleErrorGuard>();
export const test = apiTest.extend<BrowserFixtures>({
  // Override page instead of forcing an unused default page through an auto fixture.
  page: async ({ page }, use, testInfo) => {
    const observation = await observePage(page, testInfo);
    pageGuards.set(page, observation.guard);
    try { await use(page); } finally { await observation.finish(); }
  },
  consoleGuard: async ({ page }, use) => {
    const guard = pageGuards.get(page);
    if (!guard) throw new Error('Browser page was not instrumented.');
    await use(guard);
  },
  actorPage: async ({ browser, baseURL }, use, testInfo) => {
    const actors: { context: BrowserContext; finish: () => Promise<void> }[] = [];
    try {
      await use(async (options = {}) => {
        const context = await browser.newContext({ baseURL, ...options });
        try {
          const page = await context.newPage();
          const observation = await observePage(page, testInfo);
          actors.push({ context, finish: observation.finish });
          return { context, page, guard: observation.guard };
        } catch (error) { await context.close(); throw error; }
      });
    } finally {
      const outcomes = await Promise.allSettled(actors.map(async actor => {
        try { await actor.finish(); } finally { await actor.context.close(); }
      }));
      const failures = outcomes.filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');
      if (failures.length) throw new AggregateError(failures.map(outcome => outcome.reason), 'Actor page observation failed.');
    }
  },
  adminPage: async ({ actorPage }, use) => { await use((await actorPage({ storageState: 'playwright/.auth/admin.json' })).page); },
  userPage: async ({ actorPage }, use) => { await use((await actorPage({ storageState: 'playwright/.auth/user.json' })).page); },
  boardMasterPage: async ({ page }, use) => { await use(new BoardMasterPage(page)); },
  securityAdminPage: async ({ page }, use) => { await use(new SecurityAdminPage(page)); },
  collabPage: async ({ page }, use) => { await use(new CollabPage(page)); },
  statsPage: async ({ page }, use) => { await use(new StatsPage(page)); },
  opsDetailPage: async ({ page }, use) => { await use(new OpsDetailPage(page)); },
  operationalPage: async ({ page }, use) => { await use(new OperationalExtensionPage(page)); },
  businessPage: async ({ page }, use) => { await use(new BusinessExtensionPage(page)); },
});
export { expect } from '@playwright/test';
