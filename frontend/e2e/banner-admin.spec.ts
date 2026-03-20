import { test, expect } from '@playwright/test';

test.describe('Banner Administration E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass onboarding tour
    await page.addInitScript(() => {
      window.localStorage.setItem('egov_smart_tour_v1', 'true');
    });
    // Ensure we explicitly load the homepage once to allow React Context to hydrate
    await page.goto('/', { waitUntil: 'load' });
  });

  test('Verify Banner Administration Page Access and Registration Modal', async ({ page }) => {
    // Navigate to Banner Administration page
    await page.goto('/admin/system/banner');
    
    // Check for page header and description
    await expect(page.getByText('포털 프로모션 자산 거버넌스').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/전사 서비스 공지/).first()).toBeVisible();

    // Verify "New Banner" registration button is present and click it
    const registerButton = page.getByRole('button', { name: /신규 배너 등록/ }).first();
    await expect(registerButton).toBeVisible();
    await registerButton.click();

    // Verify modal is opened
    await expect(page.getByText('신규 비주얼 자산 등록').last()).toBeVisible();
    
    // Check for essential form fields in modal
    await expect(page.getByText(/배너 명칭/).first()).toBeVisible();
    await expect(page.getByPlaceholder('배너 이름 입력')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: '취소' }).first().click();
    await expect(page.getByText('신규 비주얼 자산 등록')).not.toBeVisible();
  });

  test('Switch between Banner and Popup tabs', async ({ page }) => {
    await page.goto('/admin/system/banner');
    
    // Check initial tab (Banner)
    await expect(page.getByText('비주얼 배너 스트림 분석')).toBeVisible({ timeout: 15000 });

    // Switch to Popup tab
    await page.getByRole('tab', { name: /레이어 팝업/ }).click();
    
    // Verify content changed to Popup context
    await expect(page.getByText('인터랙션 팝업 오케스트레이션')).toBeVisible();
    
    // Check "New Popup" button
    const registerPopupButton = page.getByRole('button', { name: /신규 팝업 등록/ }).first();
    await expect(registerPopupButton).toBeVisible();
  });
});
