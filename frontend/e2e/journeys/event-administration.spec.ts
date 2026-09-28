import { expect, test } from '../fixtures/browser-test';
test.describe('Admin System (Core Management)', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    test.describe('Advanced Operations & Analytics', () => {
        test('Event Operations: Full Event Lifecycle', async ({ opsDetailPage, page, adminRequest }) => {
            const events = '/api/v1/admin/operation/events';
            const eventName = `E2E Event ${Math.random().toString(36).substring(7)}`;
            await opsDetailPage.goto();
            // 1. Create Event
            const created = page.waitForResponse(response => new URL(response.url()).pathname === events
                && response.request().method() === 'POST');
            await opsDetailPage.createEvent({
                name: eventName,
                desc: 'Automated E2E Test Event Description',
                capacity: 100,
                startDate: '2026-05-01',
                endDate: '2026-05-03'
            });
            const createResponse = await created;
            expect(createResponse.status()).toBe(200);
            const eventId = (await createResponse.json() as { data: number }).data;
            const detail = await adminRequest.get(`${events}/${eventId}`);
            expect(detail.status()).toBe(200);
            expect((await detail.json()).data).toMatchObject({ evntAprvYn: 'N' });
            await opsDetailPage.searchEvents(eventName);
            await page.getByRole('button', { name: `${eventName} 수정`, exact: true }).click();
            const dialog = page.getByRole('dialog');
            await expect(dialog.getByLabel('행사 명칭', { exact: true })).toHaveValue(eventName);
            await expect(dialog.getByLabel(/승인/)).toHaveCount(0);
            const corrected = `${eventName} corrected`;
            await dialog.getByLabel('행사 명칭', { exact: true }).fill(corrected);
            const updated = page.waitForResponse(response => new URL(response.url()).pathname === `${events}/${eventId}`
                && response.request().method() === 'PUT');
            await dialog.getByRole('button', { name: '변경 사항 저장', exact: true }).click();
            expect((await updated).status()).toBe(200);
            const saved = await adminRequest.get(`${events}/${eventId}`);
            expect((await saved.json()).data).toMatchObject({ evntNm: corrected, evntAprvYn: 'N' });
            await opsDetailPage.deleteEvent(corrected);
        });
    });
});
