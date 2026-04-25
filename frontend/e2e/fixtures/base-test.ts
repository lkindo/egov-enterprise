import { test as base } from '@playwright/test';
import { BBSPage } from '../pages/BBSPage';
import { UserAdminPage } from '../pages/UserAdminPage';
import { BoardMasterPage } from '../pages/BoardMasterPage';
import { ConsoleErrorGuard } from './error-detector';

type MyFixtures = {
  bbsPage: BBSPage;
  userAdminPage: UserAdminPage;
  boardMasterPage: BoardMasterPage;
  consoleGuard: ConsoleErrorGuard;
};

export const test = base.extend<MyFixtures>({
  // 콘솔 가드 Fixture (auto: true로 설정하여 모든 테스트에서 자동 실행)
  consoleGuard: [async ({ page }, use) => {
    const guard = new ConsoleErrorGuard(page);
    await guard.install();
    await use(guard);
    // 테스트 종료 후 에러 검증
    await guard.verify();
  }, { auto: true }],

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
