import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility (A11y) Testing
 * 
 * WCAG (Web Content Accessibility Guidelines) 준수 여부를 자동 검증합니다.
 * axe-core 를 사용하여 스크린 리더, 키보드 네비게이션, 색상 대비 등을 검사합니다.
 * 
 * 실행 방법:
 * - 전체 테스트 실행: npm run test:e2e
 * - A11y 테스트만 실행: npm run test:e2e -- a11y.spec.ts
 * - UI 모드에서 실행: npm run test:e2e:ui
 * 
 * 참고:
 * - WCAG 2.1 Level A & AA 기준을 기본으로 검사합니다.
 * - 'incomplete' 결과는 수동 검토가 필요한 사항입니다.
 */

test.describe('Accessibility - Admin Pages', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('should not have accessibility violations on dashboard', async ({ page }) => {
        await page.goto('/admin', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility violations on login page', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility violations on common codes page', async ({ page }) => {
        await page.goto('/admin/common-codes', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility violations on user management page', async ({ page }) => {
        await page.goto('/admin/users', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility violations on menu management page', async ({ page }) => {
        await page.goto('/admin/menus', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility violations on board management page', async ({ page }) => {
        await page.goto('/admin/boards', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility violations on statistics page', async ({ page }) => {
        await page.goto('/admin/statistics', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });
});

test.describe('Accessibility - Specific WCAG Rules', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('should have proper heading hierarchy', async ({ page }) => {
        await page.goto('/admin', { waitUntil: 'networkidle' });

        // h1 이 여러 개 있는지 확인 (위반 사항)
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
            .analyze();

        // heading-order 위반 확인
        const headingOrderViolations = accessibilityScanResults.violations.filter(
            v => v.id === 'heading-order'
        );

        expect(headingOrderViolations).toHaveLength(0);
    });

    test('should have sufficient color contrast', async ({ page }) => {
        await page.goto('/admin', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2aa', 'wcag2aaa'])
            .analyze();

        // 색상 대비 관련 위반만 필터링
        const contrastViolations = accessibilityScanResults.violations.filter(
            v => v.id.includes('color-contrast')
        );

        expect(contrastViolations).toHaveLength(0);
    });

    test('should have proper form labels', async ({ page }) => {
        await page.goto('/admin/users', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'best-practice'])
            .analyze();

        // 폼 레이블 관련 위반만 필터링
        const labelViolations = accessibilityScanResults.violations.filter(
            v => v.id === 'label' || v.id === 'aria-required-attr'
        );

        expect(labelViolations).toHaveLength(0);
    });

    test('should have keyboard accessible interactive elements', async ({ page }) => {
        await page.goto('/admin', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'best-practice'])
            .analyze();

        // 키보드 접근성 관련 위반만 필터링
        const keyboardViolations = accessibilityScanResults.violations.filter(
            v => v.id === 'keyboard' || v.id === 'focusable-modal' || v.id === 'focus-order'
        );

        expect(keyboardViolations).toHaveLength(0);
    });

    test('should have proper ARIA attributes', async ({ page }) => {
        await page.goto('/admin', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();

        // ARIA 관련 위반만 필터링
        const ariaViolations = accessibilityScanResults.violations.filter(
            v => v.id.startsWith('aria-')
        );

        expect(ariaViolations).toHaveLength(0);
    });
});

test.describe('Accessibility - Mobile', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('should not have accessibility violations on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/admin', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });
});

test.describe('Accessibility - Report Violations with Details', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('should log accessibility violations if any exist', async ({ page }) => {
        await page.goto('/admin', { waitUntil: 'networkidle' });

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        if (accessibilityScanResults.violations.length > 0) {
            console.log('\n=== ACCESSIBILITY VIOLATIONS FOUND ===\n');
            accessibilityScanResults.violations.forEach(violation => {
                console.log(`\n[ ${violation.impact?.toUpperCase()} ] ${violation.id}`);
                console.log(`Description: ${violation.description}`);
                console.log(`Help URL: ${violation.helpUrl}`);
                console.log(`Affected nodes: ${violation.nodes.length}`);
                
                // 첫 3 개 노드만 상세 출력
                violation.nodes.slice(0, 3).forEach((node, index) => {
                    console.log(`  Node ${index + 1}: ${node.html}`);
                    if (node.failureSummary) {
                        console.log(`    Fix: ${node.failureSummary}`);
                    }
                });
            });
            console.log('\n=====================================\n');
        }

        // 실제 테스트는 실패시키지 않고 로그만 출력 (모니터링 용도)
        // 엄격하게 검사하려면 아래 주석 해제:
        // expect(accessibilityScanResults.violations).toEqual([]);
    });
});
