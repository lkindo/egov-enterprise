import { test as base } from '@playwright/test';
import { BBSPage } from '../pages/BBSPage';
import { UserAdminPage } from '../pages/UserAdminPage';
import { BoardMasterPage } from '../pages/BoardMasterPage';

export const test = base.extend<{
  bbsPage: BBSPage;
  userAdminPage: UserAdminPage;
  boardMasterPage: BoardMasterPage;
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
  boardMasterPage: async ({ page }, use) => {
    // Universal onboarding bypass
    await page.addInitScript(() => {
       window.localStorage.setItem('egov_smart_tour_v1', 'true');
    });
    
    const boardMasterPage = new BoardMasterPage(page);
    await use(boardMasterPage);
  },
});

export { expect } from '@playwright/test';
