import { test, expect } from '@playwright/test';

test.describe('Admin Advanced Features E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass onboarding tour
    await page.addInitScript(() => {
      window.localStorage.setItem('egov_smart_tour_v1', 'true');
    });
    // Ensure we explicitly load the homepage once to allow React Context to hydrate
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test.describe('Statistical Intelligence', () => {
    test('Verify Board Statistics Page', async ({ page }) => {
      await page.goto('/admin/stats/board');
      await expect(page.getByText('인텔리전스 허브').first()).toBeVisible();
      await expect(page.locator('canvas').first()).toBeVisible(); // Check for Chart
      await expect(page.getByText(/콘텐츠 지표 분석/).first()).toBeVisible();
    });

    test('Verify Data Usage Statistics Page', async ({ page }) => {
      await page.goto('/admin/stats/data-usage');
      await expect(page.getByText('인텔리전스 허브').first()).toBeVisible();
      await expect(page.locator('canvas').first()).toBeVisible();
      await expect(page.getByText(/시스템 활성 지표/).first()).toBeVisible();
    });

    test('Verify Report Statistics Page', async ({ page }) => {
      await page.goto('/admin/stats/report');
      await expect(page.getByText('인텔리전스 허브').first()).toBeVisible();
      await expect(page.locator('canvas').first()).toBeVisible();
      await expect(page.getByText(/운영 보고서 분석/).first()).toBeVisible();
    });
  });

  test.describe('Organizational & Resource Management', () => {
    test('User Absence Management Workflow', async ({ page }) => {
      await page.goto('/admin/user/absences');
      await expect(page.getByText(/기업 조직 허브|인텔리전스 노드/).first()).toBeVisible();
      
      // Toggle absence status for first user
      const firstSwitch = page.getByRole('switch').first();
      if (await firstSwitch.isVisible()) {
        const initialState = await firstSwitch.getAttribute('aria-checked');
        await firstSwitch.click();
        // Look for success toast - generic text
        await expect(page.getByText(/상태|업데이트|완료/).first()).toBeVisible({ timeout: 15000 });
        await expect(firstSwitch).not.toHaveAttribute('aria-checked', initialState || '');
      }
    });

    test('Department Management Workflow', async ({ page }) => {
      await page.goto('/admin/user/departments');
      await expect(page.getByText(/기업 조직 허브|인텔리전스 노드/).first()).toBeVisible();
      
      // Open "New Node" dialog
      await page.getByRole('button', { name: /신규 부서 등록/ }).first().click();
      await expect(page.getByText('신규 부서 등록', { exact: true }).last()).toBeVisible();
      
      // Fill and close (Mocking data, actual submit skipped to prevent DB clutter if needed)
      await page.getByPlaceholder(/부서 명/).first().fill('Intelligence Unit');
      await page.getByPlaceholder(/부서 설명/).first().fill('Managed by Autonomous Agent');
      await page.getByRole('button', { name: '취소' }).first().click();
    });
  });

  test.describe('Supplementary Services', () => {
    test('SMS Transmission System', async ({ page }) => {
      await page.goto('/admin/uss/ion/sms');
      await expect(page.getByText('문자 메시지 매트릭스').first()).toBeVisible();
      
      // Open "New Message" dialog
      await page.getByRole('button', { name: /메시지 작성/ }).first().click();
      await expect(page.getByText('메시지 발송').last()).toBeVisible();
      
      await page.getByPlaceholder('010-0000-0000').first().fill('010-1234-5678');
      await page.getByPlaceholder(/내용/).first().fill('E2E Test Payload');
      await page.getByRole('button', { name: '취소' }).first().click();
    });

    test('Governance & Policy Editor', async ({ page }) => {
      await page.goto('/admin/user/indvdl-info-policy');
      await expect(page.getByText('개인정보 처리 프레임워크').first()).toBeVisible();
      
      // Switch to Edit Mode
      await page.getByRole('button', { name: '정책 수정' }).first().click();
      await expect(page.getByText(/정책 내용/).first()).toBeVisible();
      await expect(page.locator('textarea').first()).toBeVisible();
      
      await page.getByRole('button', { name: '취소' }).first().click();
    });
  });

  test.describe('Community & Engagement', () => {
    test('Opinion Matrix (Online Poll) System', async ({ page }) => {
      await page.goto('/admin/survey/polls');
      await expect(page.getByText('온라인 설문 인텔리전스').first()).toBeVisible();
      
      await page.getByRole('button', { name: /신규 설문 등록/ }).first().click();
      await expect(page.getByText('신규 설문 등록', { exact: true }).last()).toBeVisible();
      
      await page.getByPlaceholder(/설문 명/).first().fill('System Satisfaction Survey');
      await page.getByRole('button', { name: '취소' }).first().click();
    });

    test('Structural Assets (Template) Management', async ({ page }) => {
      await page.goto('/admin/community/templates');
      await expect(page.getByText('템플릿 시스템 아키텍처').first()).toBeVisible();
      
      await page.getByRole('button', { name: /신규 블루프린트/ }).first().click();
      await expect(page.getByText('신규 블루프린트 등록', { exact: true }).last()).toBeVisible();
      await page.getByRole('button', { name: '취소' }).first().click();
    });
  });
});
