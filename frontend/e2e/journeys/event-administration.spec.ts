import { test } from '../fixtures/browser-test';
test.describe('Admin System (Core Management)', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    test.describe('Advanced Operations & Analytics', () => {
        test('Event Operations: Full Event Lifecycle', async ({ opsDetailPage }) => {
            const eventName = `E2E Event ${Math.random().toString(36).substring(7)}`;
            await opsDetailPage.goto();
            // 1. Create Event
            await opsDetailPage.createEvent({
                name: eventName,
                desc: 'Automated E2E Test Event Description',
                capacity: 100,
                startDate: '2026-05-01',
                endDate: '2026-05-03'
            });
            // 2. Search and Delete
            await opsDetailPage.deleteEvent(eventName);
        });
    });
});
