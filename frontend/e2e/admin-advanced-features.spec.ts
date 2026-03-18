import { test, expect } from '@playwright/test';

test.describe('Admin Advanced Features E2E Verification', () => {
  
  test.describe('Statistical Intelligence', () => {
    test('Verify Board Statistics Page', async ({ page }) => {
      await page.goto('/admin/stats/board');
      await expect(page.getByText('게시물 통계 아키텍처')).toBeVisible();
      await expect(page.locator('canvas')).toBeVisible(); // Check for Chart
      await expect(page.getByText('BOARD CONTENT ANALYTICS')).toBeVisible();
    });

    test('Verify Data Usage Statistics Page', async ({ page }) => {
      await page.goto('/admin/stats/data-usage');
      await expect(page.getByText('자료 이용 현황 매트릭스')).toBeVisible();
      await expect(page.locator('canvas')).toBeVisible();
    });

    test('Verify Report Statistics Page', async ({ page }) => {
      await page.goto('/admin/stats/report');
      await expect(page.getByText('보고서 생성 인텔리전스')).toBeVisible();
      await expect(page.locator('canvas')).toBeVisible();
    });
  });

  test.describe('Organizational & Resource Management', () => {
    test('User Absence Management Workflow', async ({ page }) => {
      await page.goto('/admin/user/absences');
      await expect(page.getByText('부재 관리 인텔리전스')).toBeVisible();
      
      // Toggle absence status for first user
      const firstSwitch = page.getByRole('switch').first();
      if (await firstSwitch.isVisible()) {
        const initialState = await firstSwitch.getAttribute('aria-checked');
        await firstSwitch.click();
        await expect(page.getByText('사용자의 상태가')).toBeVisible(); // Success toast
        await expect(firstSwitch).not.toHaveAttribute('aria-checked', initialState || '');
      }
    });

    test('Department Management Workflow', async ({ page }) => {
      await page.goto('/admin/user/departments');
      await expect(page.getByText('조직 체계 매트릭스')).toBeVisible();
      
      // Open "New Node" dialog
      await page.getByRole('button', { name: 'New Node' }).click();
      await expect(page.getByText('New Node', { exact: true })).toBeVisible();
      
      // Fill and close (Mocking data, actual submit skipped to prevent DB clutter if needed)
      await page.getByPlaceholder('DEPARTMENT NAME...').fill('Intelligence Unit');
      await page.getByPlaceholder('DEPARTMENT DESCRIPTION...').fill('Managed by Autonomous Agent');
      await page.getByRole('button', { name: 'Cancel' }).click();
    });
  });

  test.describe('Supplementary Services', () => {
    test('SMS Transmission System', async ({ page }) => {
      await page.goto('/admin/uss/ion/sms');
      await expect(page.getByText('문자 메시지 매트릭스')).toBeVisible();
      
      // Open "New Message" dialog
      await page.getByRole('button', { name: 'New Message' }).click();
      await expect(page.getByText('New Transmission')).toBeVisible();
      
      await page.getByPlaceholder('010-0000-0000').fill('010-1234-5678');
      await page.getByPlaceholder('MESSAGE CONTENT...').fill('E2E Test Payload');
      await page.getByRole('button', { name: 'Cancel' }).click();
    });

    test('Governance & Policy Editor', async ({ page }) => {
      await page.goto('/admin/user/indvdl-info-policy');
      await expect(page.getByText('보안 정책 거버넌스')).toBeVisible();
      
      // Switch to Edit Mode
      await page.getByRole('button', { name: 'Modify Policy' }).click();
      await expect(page.getByText('Policy Payload')).toBeVisible();
      await expect(page.locator('textarea')).toBeVisible();
      
      await page.getByRole('button', { name: 'Cancel' }).click();
    });
  });

  test.describe('Community & Engagement', () => {
    test('Opinion Matrix (Online Poll) System', async ({ page }) => {
      await page.goto('/admin/survey/polls');
      await expect(page.getByText('온라인 설문 인텔리전스')).toBeVisible();
      
      await page.getByRole('button', { name: 'New Inquiry' }).click();
      await expect(page.getByText('New Inquiry', { exact: true })).toBeVisible();
      
      await page.getByPlaceholder('POLL NAME...').fill('System Satisfaction Survey');
      await page.getByRole('button', { name: 'Cancel' }).click();
    });

    test('Structural Assets (Template) Management', async ({ page }) => {
      await page.goto('/admin/community/templates');
      await expect(page.getByText('템플릿 시스템 아키텍처')).toBeVisible();
      
      await page.getByRole('button', { name: 'New Blueprint' }).click();
      await expect(page.getByText('New Blueprint', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();
    });
  });
});
