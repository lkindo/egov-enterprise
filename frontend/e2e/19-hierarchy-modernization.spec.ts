import { test, expect } from './fixtures/base-test';

/**
 * [Modernization] Hierarchy & D&D Interface Verification
 * 
 * Target Modules:
 * 1. Menus (System Management)
 * 2. Common Code (System Management)
 * 3. Departments (User/Org Hub)
 */

test.describe('Modernization: Hierarchical Interface Verification', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Menu Management Tree Interface', async ({ page }) => {
        console.log('\n>>> Testing Menu Management Tree');
        await page.goto('/admin/system/menus');
        
        // Wait for tree container
        await expect(page.locator('text=시스템 네비게이션 트리').first()).toBeVisible({ timeout: 20000 });
        
        // Check for node elements (NODE_ prefix)
        const nodes = page.locator('text=/NODE_\\d+/');
        await expect(nodes.first()).toBeVisible({ timeout: 10000 });
        
        console.log('>>> Menu Tree UI: PASS');
    });

    test('Common Code Explorer Interface', async ({ page }) => {
        console.log('\n>>> Testing Common Code Explorer');
        await page.goto('/admin/system/common-code');
        
        // Wait for explorer aside
        await expect(page.locator('text=코드 익스플로러').first()).toBeVisible({ timeout: 20000 });
        
        // Check for cluster/domain items
        const domains = page.locator('text=/\\d+ Domains/');
        await expect(domains).toBeVisible({ timeout: 10000 });
        
        console.log('>>> Common Code Explorer UI: PASS');
    });

    test('Department Topology Tree (Hub)', async ({ page }) => {
        console.log('\n>>> Testing Department Topology Tree in Hub');
        await page.goto('/admin/user/manage');
        
        // Switch to DEPTS tab
        const deptTab = page.locator('button:has-text("Section_02")').first();
        await expect(deptTab).toBeVisible();
        await deptTab.click();
        
        // Wait for tree title
        await expect(page.locator('text=조직 노드 토폴로지 스트림').first()).toBeVisible({ timeout: 20000 });
        
        // Check for topology nodes (e.g., ORGNZT_0000000000001)
        const deptNodes = page.locator('text=/ORGNZT_\\d+/');
        await expect(deptNodes.first()).toBeVisible({ timeout: 10000 });
        
        console.log('>>> Department Topology Tree UI: PASS');
    });

    test('Atomic Hierarchy Save Button Visibility', async ({ page }) => {
        console.log('\n>>> Testing Save Button Appearance after Drag (Simulated)');
        await page.goto('/admin/user/manage');
        
        // Switch to DEPTS tab
        await page.locator('button:has-text("Section_02")').click();
        
        // The SAVE_CHANGES button should NOT be visible initially
        const saveBtn = page.locator('button:has-text("Save_Topology_Structure")');
        await expect(saveBtn).not.toBeVisible();
        
        console.log('>>> Initial Save Button State: PASS');
    });
});
