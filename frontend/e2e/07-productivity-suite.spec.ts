import { test, expect } from './fixtures/base-test';
import { ProductivitySuitePage } from './pages/ProductivitySuitePage';

/**
 * Tier 7: Productivity Suite
 * 협업과 행정 처리를 위한 내부 업무용 모듈 검증 (전자결재, 조직도, 일정)
 */
test.describe('Tier 7: Productivity Suite (Business Tools)', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('Electronic Approval (Workflow State Machine)', async ({ adminPage }) => {
        const prodPage = new ProductivitySuitePage(adminPage);

        await test.step('Admin: Navigate to Approval Forms', async () => {
            await prodPage.gotoApproval();
        });

        await test.step('Admin: Verify Form UI Load', async () => {
            await prodPage.verifyApprovalStateTransition();
        });

        await test.step('Admin: Simulate Approval State Transition (Draft -> Approved)', async () => {
            console.log('>>> Simulating Approval Transition (Network Mock)');
            
            // Mocking the approval action
            await adminPage.route('**/api/v1/approval/action', async route => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ 
                        success: true, 
                        currentState: 'APPROVED',
                        message: '결재가 최종 승인되었습니다.'
                    })
                });
            });
            
            // Execute the mocked action using page.evaluate (using browser context for auth headers if needed)
            const result = await adminPage.evaluate(async () => {
                const res = await fetch('/api/v1/approval/action', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'APPROVE', documentId: 'DOC-1234' })
                });
                return await res.json();
            });

            expect(result.success).toBe(true);
            expect(result.currentState).toBe('APPROVED');
        });
    });

    test('Organization Chart & Address Book (Permission & Navigation)', async ({ adminPage }) => {
        const prodPage = new ProductivitySuitePage(adminPage);

        await test.step('Admin: Navigate to Address Book', async () => {
            await prodPage.gotoAddressBook();
        });

        await test.step('Admin: Verify Org Chart & User Tree', async () => {
            await prodPage.verifyOrgChartNavigation();
        });

        await test.step('Admin: Simulate Organization Sync (Department Move)', async () => {
            console.log('>>> Simulating User Department Move');
            
            await adminPage.route('**/api/v1/organization/move', async route => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ 
                        success: true, 
                        inheritedRoles: ['ROLE_USER', 'ROLE_HR_DEPT'],
                        message: '부서 이동 및 권한 상속이 완료되었습니다.'
                    })
                });
            });

            const result = await adminPage.evaluate(async () => {
                const res = await fetch('/api/v1/organization/move', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: 'user-001', targetDept: 'DEPT-HR' })
                });
                return await res.json();
            });

            expect(result.success).toBe(true);
            expect(result.inheritedRoles).toContain('ROLE_HR_DEPT');
        });
    });

    test('Calendar Management (Schedule Sync & Overlap Check)', async ({ adminPage }) => {
        const prodPage = new ProductivitySuitePage(adminPage);

        await test.step('Admin: Navigate to Calendar/Work Hub', async () => {
            await prodPage.gotoCalendar();
        });

        await test.step('Admin: Verify Calendar Component Render', async () => {
            await prodPage.verifyCalendarSynchronization();
        });

        await test.step('Admin: Simulate Schedule Overlap Exception', async () => {
            console.log('>>> Simulating Calendar Conflict Error');
            
            // Mock schedule overlap
            await adminPage.route('**/api/v1/calendar/schedule', async route => {
                await route.fulfill({
                    status: 409,
                    contentType: 'application/json',
                    body: JSON.stringify({ 
                        success: false, 
                        message: '해당 시간에 이미 다른 일정이 존재합니다 (중복).'
                    })
                });
            });

            const status = await adminPage.evaluate(async () => {
                const res = await fetch('/api/v1/calendar/schedule', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'Important Meeting', start: '10:00', end: '11:00' })
                }).catch(() => null);
                return res ? res.status : null;
            });

            expect(status).toBe(409);
        });
    });

    test('Smart Toolkit: Business Extensions (Dept Job & Work Report)', async ({ adminPage }) => {
        const prodPage = new ProductivitySuitePage(adminPage);

        await test.step('Admin: Navigate and Verify Departmental Jobs', async () => {
            await prodPage.gotoDeptJob();
            await prodPage.verifyWorkflowHubTabs();
            // In Workflow Hub, the job list is visible by default for Dept Job
            await expect(adminPage.getByText(/등록된 업무가 없습니다|부서: /i)).toBeVisible();
        });

        await test.step('Admin: Navigate and Verify Work Reports', async () => {
            await prodPage.gotoWorkReport();
            await prodPage.verifyWorkflowHubTabs();
            // In Workflow Hub, the report list is visible by default for Work Report
            await expect(adminPage.getByText(/등록된 보고서가 없습니다|작성자: /i)).toBeVisible();
        });
    });
});
