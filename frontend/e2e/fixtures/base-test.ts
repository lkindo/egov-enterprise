import { test as base } from '@playwright/test';
import { BBSPage } from '../pages/BBSPage';
import { UserAdminPage } from '../pages/UserAdminPage';
import { BoardMasterPage } from '../pages/BoardMasterPage';
import { setupGlobalErrorDetection } from './error-detector';

type MyFixtures = {
  bbsPage: BBSPage;
  userAdminPage: UserAdminPage;
  boardMasterPage: BoardMasterPage;
};

export const test = base.extend<MyFixtures>({
  // 전역 에러 및 네트워크 감시용 자동 fixture
  page: async ({ page }, use) => {
    await setupGlobalErrorDetection(page);
    await use(page);
  },
  bbsPage: async ({ page }, use) => {
    await use(new BBSPage(page));
  },
  userAdminPage: async ({ page }, use) => {
    await use(new UserAdminPage(page));
  },
  boardMasterPage: async ({ page }, use) => {
    await use(new BoardMasterPage(page));
  },
});

export { expect } from '@playwright/test';
