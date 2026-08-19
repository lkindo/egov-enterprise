import { test as base, Page } from '@playwright/test';
import { BBSPage } from '../pages/BBSPage';
import { UserAdminPage } from '../pages/UserAdminPage';
import { BoardMasterPage } from '../pages/BoardMasterPage';
import { SecurityAdminPage } from '../pages/SecurityAdminPage';
import { CollabPage } from '../pages/CollabPage';
import { StatsPage } from '../pages/StatsPage';
import { OpsDetailPage } from '../pages/OpsDetailPage';
import { OperationalExtensionPage } from '../pages/OperationalExtensionPage';
import { BusinessExtensionPage } from '../pages/BusinessExtensionPage';
import { ConsoleErrorGuard } from './error-detector';
import { SelfHealingAgent } from './self-healing-agent';
import { LayoutBreathingGuard } from './layout-breathing-guard';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

type MyFixtures = {
  bbsPage: BBSPage;
  userAdminPage: UserAdminPage;
  boardMasterPage: BoardMasterPage;
  securityAdminPage: SecurityAdminPage;
  collabPage: CollabPage;
  statsPage: StatsPage;
  opsDetailPage: OpsDetailPage;
  operationalPage: OperationalExtensionPage;
  businessPage: BusinessExtensionPage;
  consoleGuard: ConsoleErrorGuard;
  healingAgent: SelfHealingAgent;
  layoutGuard: LayoutBreathingGuard;
  adminPage: Page;
  userPage: Page;
  coverage?: void;
};

export const test = base.extend<MyFixtures>({
  // E2E 코드 커버리지 수집 Fixture (auto: true로 설정하여 모든 테스트에서 자동 실행)
  coverage: [async ({ page }, use) => {
    await use();
    
    try {
      const coverage = await page.evaluate(() => (window as any).__coverage__);
      if (coverage) {
        const nycOutputDir = path.join(process.cwd(), '.nyc_output');
        if (!fs.existsSync(nycOutputDir)) {
          fs.mkdirSync(nycOutputDir, { recursive: true });
        }
        const fileName = `playwright_${crypto.randomUUID()}.json`;
        fs.writeFileSync(path.join(nycOutputDir, fileName), JSON.stringify(coverage), 'utf8');
      }
    } catch (e) {
      // API 페이지나 redirect 등으로 윈도우 객체 평가 불가 시 예외 스킵하여 E2E 깨짐 방어
    }
  }, { auto: true }],

  // 선택형 로컬 진단 fixture. fuzzy 후보는 다른 요소를 고를 수 있으므로 커밋된 spec의
  // 성공 조건으로 사용하지 않는다. 현재 제품 *.spec.ts의 직접 소비는 0건이다.
  healingAgent: async ({ page }, use) => {
    await use(new SelfHealingAgent(page));
  },

  // 디자인 숨통 자동 검증 가드 Fixture
  layoutGuard: async ({ page }, use) => {
    await use(new LayoutBreathingGuard(page));
  },

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
  securityAdminPage: async ({ page }, use) => {
    await use(new SecurityAdminPage(page));
  },
  collabPage: async ({ page }, use) => {
    await use(new CollabPage(page));
  },
  statsPage: async ({ page }, use) => {
    await use(new StatsPage(page));
  },
  opsDetailPage: async ({ page }, use) => {
    await use(new OpsDetailPage(page));
  },
  operationalPage: async ({ page }, use) => {
    await use(new OperationalExtensionPage(page));
  },
  businessPage: async ({ page }, use) => {
    await use(new BusinessExtensionPage(page));
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    const page = await context.newPage();
    const guard = new ConsoleErrorGuard(page);
    await guard.install();
    await use(page);
    await guard.verify();
    await context.close();
  },

  userPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
    const page = await context.newPage();
    const guard = new ConsoleErrorGuard(page);
    await guard.install();
    await use(page);
    await guard.verify();
    await context.close();
  },
});

export { expect } from '@playwright/test';
