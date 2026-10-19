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
            // [2026-10-19] 행사 승인 흐름이 없어 승인 여부·승인일을 계약에서 걷었다 — 응답이 대기 상태를 말하지 않는다.
            const detailData = (await detail.json()).data;
            expect(detailData).not.toHaveProperty('evntAprvYn');
            expect(detailData).not.toHaveProperty('evntAprvYmd');
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
            const savedData = (await saved.json()).data;
            expect(savedData).toMatchObject({ evntNm: corrected });
            expect(savedData).not.toHaveProperty('evntAprvYn');
            await opsDetailPage.deleteEvent(corrected);
        });
    });
});
