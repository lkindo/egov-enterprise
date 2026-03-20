import { test as base } from '@playwright/test';
import { BBSPage } from '../pages/BBSPage';

export const test = base.extend<{
  bbsPage: BBSPage;
}>({
  bbsPage: async ({ page }, use) => {
    // Universal onboarding bypass
    await page.addInitScript(() => {
      window.localStorage.setItem('egov_smart_tour_v1', 'true');
    });
    
    const bbsPage = new BBSPage(page);
    await use(bbsPage);
  },
});

export { expect } from '@playwright/test';
