import { test as base } from '@playwright/test';
import { BBSPage } from '../pages/BBSPage';
import { UserAdminPage } from '../pages/UserAdminPage';
import { BoardMasterPage } from '../pages/BoardMasterPage';

type MyFixtures = {
  bbsPage: BBSPage;
  userAdminPage: UserAdminPage;
  boardMasterPage: BoardMasterPage;
};

export const test = base.extend<MyFixtures>({
  bbsPage: async ({ page }, use) => {
    await use(new BBSPage(page));
  },
  userAdminPage: async ({ page }, use) => {
    await use(new UserAdminPage(page));
  },
  boardMasterPage: async ({ page }, use) => {    await use(new BoardMasterPage(page));
  },
});

export { expect } from '@playwright/test';
