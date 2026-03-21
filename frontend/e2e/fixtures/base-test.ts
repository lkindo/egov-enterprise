import { test as base } from '@playwright/test';
import { BBSPage } from '../pages/BBSPage';
import { UserAdminPage } from '../pages/UserAdminPage';

export const test = base.extend<{
  bbsPage: BBSPage;
  userAdminPage: UserAdminPage;
}>({
  bbsPage: async ({ page }, use) => {
    // Universal onboarding bypass
    await page.addInitScript(() => {
      window.localStorage.setItem('egov_smart_tour_v1', 'true');
    });
    
    const bbsPage = new BBSPage(page);
    await use(bbsPage);
  },
  userAdminPage: async ({ page }, use) => {
    // Universal onboarding bypass
    await page.addInitScript(() => {
       window.localStorage.setItem('egov_smart_tour_v1', 'true');
    });
    
    const userAdminPage = new UserAdminPage(page);
    await use(userAdminPage);
  },
});

export { expect } from '@playwright/test';
