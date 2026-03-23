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
    
    // Check for page header and description (Matches PageHeader and HubHeader)
    await expect(page.getByText('배너/팝업 관리').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/배너 자산과 공지 팝업을 등록/).first()).toBeVisible();

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
    
    // Check initial tab (Banner) - content title in HubSectionCard
    // Use .first() and be more flexible with text matching
    await expect(page.getByText('배너 목록').first()).toBeVisible({ timeout: 20000 });

    // Switch to Popup tab (Using the side navigation button)
    // Find the '팝업 설정' button specifically in the navigation panel
    await page.getByRole('button', { name: /팝업 설정/ }).click();
    
    // Verify content changed to Popup context
    await expect(page.getByText('팝업 목록').first()).toBeVisible({ timeout: 20000 });
    
    // Check "New Popup" button
    const registerPopupButton = page.getByRole('button', { name: /신규 팝업 등록/ }).first();
    await expect(registerPopupButton).toBeVisible({ timeout: 15000 });
  });
});
