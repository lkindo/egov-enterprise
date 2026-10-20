import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { request as playwrightRequest, type APIRequestContext, type APIResponse, type Download, type Page } from '@playwright/test';
import { expect, test as baseTest } from '../fixtures/browser-test';
import { createVisualAdmin } from '../fixtures/visual-admin';
import { getAdminBearerToken } from '../utils/admin-token';
import { anonymousCsrfRequestState } from '../fixtures/csrf';

/**
 * 관측 여정 — 알려진 행동을 하고, 그 행동이 남긴 기록 행을 화면에서 찾는다(2026-10-20).
 *
 * 종전 이 파일은 리다이렉트 화면(/admin/system/audit)에서 페이지 아무 곳의 날짜 문자열 하나만 확인했다. 기록이 실제로 남는지,
 * 화면이 그 기록을 조건으로 찾게 해 주는지는 보지 않았다. 이제 세 기록을 행동부터 따라간다.
 *
 * - 권한 없는 요청 → 실패 요청(시스템) 로그: 보안 필터가 거부한 요청은 핸들러가 없어 서비스 칸에 요청 경로가 남는다.
 *   경로에 이 실행만의 표지를 넣어 다른 실행의 행과 섞이지 않게 한다. 기록은 비동기 리스너가 쓰므로 API 로 도착을 기다린 뒤 화면을 연다.
 * - 사용자 상세 조회(개인정보 접근) → 개인정보 조회 기록과 민감 작업 감사 원장: 응답 준비 단계가 정보주체를 대상으로 남긴다.
 *   개인정보 조회 기록 화면은 정보주체 칸을 보이지 않으므로(API 도 싣지 않는다) 정보주체는 같은 준비 단계를 담은 감사 원장의
 *   '대상'으로 확인한다. 감사 원장 열람 권한(ADT_LOG_READ)은 기본 그룹에 없어, 이 테스트만의 그룹과 일회용 관리자를 쓴다.
 * - 감사 원장 내보내기 → 원장에 사유와 함께 남는다.
 *
 * 날짜·기간 조건을 쓰지 않는다 — 앱은 한국 시각, 러너는 UTC 라 자정 근처에 날짜 경계가 어긋난다. 일회용 계정은 브라우저 관찰이
 * 끝난 뒤(고정 장치 정리 순서) 지운다 — 열린 화면의 주체를 먼저 지우면 화면의 다음 요청이 실패로 잡힌다.
 */
const MAX_ENTRY_BYTES = 10 * 1024 * 1024;

/** Read the ZIP directory, including POI's ZIP64 entries, without extracting files to disk. */
function readXlsxArchive(bytes: Buffer): Map<string, string> {
    const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    assert(end >= 0 && end + 22 <= bytes.length, 'XLSX ZIP end record is missing');
    assert.equal(end + 22 + bytes.readUInt16LE(end + 20), bytes.length, 'XLSX ZIP is truncated or has trailing bytes');
    let count = bytes.readUInt16LE(end + 10);
    let directorySize = bytes.readUInt32LE(end + 12);
    let cursor = bytes.readUInt32LE(end + 16);
    const uint64 = (offset: number) => {
        const value = bytes.readBigUInt64LE(offset);
        assert(value <= BigInt(Number.MAX_SAFE_INTEGER), 'XLSX ZIP64 value is too large');
        return Number(value);
    };
    if (count === 0xffff || directorySize === 0xffffffff || cursor === 0xffffffff) {
        assert.equal(bytes.readUInt32LE(end - 20), 0x07064b50, 'XLSX ZIP64 locator is missing');
        const zip64 = uint64(end - 12);
        assert.equal(bytes.readUInt32LE(zip64), 0x06064b50, 'XLSX ZIP64 end record is missing');
        count = uint64(zip64 + 32);
        directorySize = uint64(zip64 + 40);
        cursor = uint64(zip64 + 48);
    }
    const directoryStart = cursor;
    const directoryEnd = directoryStart + directorySize;
    assert(directoryEnd <= end && count > 0 && count < 100, 'XLSX ZIP directory is invalid');
    const entries = new Map<string, string>();
    for (let index = 0; index < count; index++) {
        assert.equal(bytes.readUInt32LE(cursor), 0x02014b50, 'XLSX ZIP directory entry is missing');
        const method = bytes.readUInt16LE(cursor + 10);
        let compressedSize = bytes.readUInt32LE(cursor + 20);
        let size = bytes.readUInt32LE(cursor + 24);
        const nameLength = bytes.readUInt16LE(cursor + 28);
        const extraLength = bytes.readUInt16LE(cursor + 30);
        const commentLength = bytes.readUInt16LE(cursor + 32);
        let local = bytes.readUInt32LE(cursor + 42);
        const name = bytes.toString('utf8', cursor + 46, cursor + 46 + nameLength);
        const next = cursor + 46 + nameLength + extraLength + commentLength;
        assert(next <= directoryEnd && !entries.has(name), 'XLSX ZIP entry bounds or names are invalid');
        for (let extra = cursor + 46 + nameLength; extra + 4 <= next - commentLength;) {
            const extraEnd = extra + 4 + bytes.readUInt16LE(extra + 2);
            assert(extraEnd <= next - commentLength, 'XLSX ZIP extra field is truncated');
            if (bytes.readUInt16LE(extra) === 1) {
                let value = extra + 4;
                if (size === 0xffffffff) { size = uint64(value); value += 8; }
                if (compressedSize === 0xffffffff) { compressedSize = uint64(value); value += 8; }
                if (local === 0xffffffff) { local = uint64(value); value += 8; }
                assert(value <= extraEnd, 'XLSX ZIP64 entry is truncated');
            }
            extra = extraEnd;
        }
        assert(size <= MAX_ENTRY_BYTES && compressedSize <= MAX_ENTRY_BYTES, 'XLSX fixture entry exceeds its size bound');
        assert.equal(bytes.readUInt32LE(local), 0x04034b50, 'XLSX ZIP local entry is missing');
        const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
        assert(start + compressedSize <= directoryStart, 'XLSX ZIP file data is truncated');
        const compressed = bytes.subarray(start, start + compressedSize);
        assert(method === 0 || method === 8, 'XLSX ZIP compression is unsupported');
        const content = method === 8 ? inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_BYTES }) : compressed;
        assert.equal(content.length, size, 'XLSX ZIP expanded size differs from its directory');
        entries.set(name, content.toString('utf8'));
        cursor = next;
    }
    assert.equal(cursor, directoryEnd, 'XLSX ZIP directory is incomplete');
    for (const required of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels']) {
        assert(entries.has(required), `XLSX package is missing ${required}`);
    }
    return entries;
}

/** Await transport completion, then parse the actual workbook and worksheet cells. */
async function downloadedXlsxRows(download: Download, page: Page, sheetName: string): Promise<string[][]> {
    assert.equal(await download.failure(), null, 'The XLSX download did not complete');
    const stream = await download.createReadStream();
    assert(stream, 'The completed XLSX download has no readable stream');
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const entries = [...readXlsxArchive(Buffer.concat(chunks))];
    return page.evaluate(({ entries, sheetName }) => {
        const files = new Map(entries);
        const xml = (name: string) => {
            const text = files.get(name);
            if (text === undefined) throw new Error(`XLSX package is missing ${name}`);
            const document = new DOMParser().parseFromString(text, 'application/xml');
            if (document.querySelector('parsererror')) throw new Error(`XLSX XML is malformed: ${name}`);
            return document;
        };
        const workbook = xml('xl/workbook.xml');
        const sheets = Array.from(workbook.getElementsByTagName('sheet'));
        if (sheets.length !== 1 || sheets[0].getAttribute('name') !== sheetName) throw new Error('Unexpected XLSX worksheet');
        const relationshipId = sheets[0].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
        const relationship = Array.from(xml('xl/_rels/workbook.xml.rels').getElementsByTagName('Relationship'))
            .find(entry => entry.getAttribute('Id') === relationshipId);
        const target = relationship?.getAttribute('Target');
        if (!target || relationship?.getAttribute('TargetMode') === 'External') throw new Error('XLSX worksheet relationship is missing');
        const sheetPath = new URL(target, 'https://xlsx.invalid/xl/workbook.xml').pathname.slice(1);
        const sharedStrings = files.has('xl/sharedStrings.xml')
            ? Array.from(xml('xl/sharedStrings.xml').getElementsByTagName('si')).map(entry => entry.textContent ?? '')
            : [];
        return Array.from(xml(sheetPath).getElementsByTagName('row')).map(row =>
            Array.from(row.getElementsByTagName('c')).map(cell => {
                if (cell.getAttribute('t') === 'inlineStr') return cell.getElementsByTagName('is')[0]?.textContent ?? '';
                const value = cell.getElementsByTagName('v')[0]?.textContent ?? '';
                if (cell.getAttribute('t') !== 's') return value;
                const text = sharedStrings[Number(value)];
                if (text === undefined) throw new Error('XLSX cell refers to a missing shared string');
                return text;
            }));
    }, { entries, sheetName });
}

const AUTHORIZATION = '/api/v1/admin/authorization';
type AuditActor = Awaited<ReturnType<typeof createVisualAdmin>>;
type Headers = Record<string, string>;

async function data<T>(response: APIResponse, label: string, expectedStatus = 200): Promise<T> {
    // 상태만 단언한다 — 응답 헤더·자격 증명·본문은 진단 출력에 싣지 않는다.
    expect(response.status(), label).toBe(expectedStatus);
    return (await response.json() as { data: T }).data;
}

function requireLoopback(baseURL: string | undefined): string {
    if (!baseURL || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
        throw new Error('Audit journey fixtures require the isolated loopback E2E stack.');
    }
    return baseURL;
}

async function deleteGroup(request: APIRequestContext, headers: Headers, code: string) {
    const snapshot = await data<{ version: string }>(await request.get(`${AUTHORIZATION}/groups/${code}`, { headers }), '감사 열람 그룹 조회');
    const removed = await request.delete(`${AUTHORIZATION}/groups/${code}`, { headers, params: { version: snapshot.version } });
    expect(removed.status(), '감사 열람 그룹 정리').toBe(200);
}

/**
 * 감사 원장을 읽는 일회용 관리자(ROLE_ADMIN + 이 테스트만의 ADT_LOG_READ 그룹)와 그가 상세를 열어 볼 정보주체.
 * 고정 장치는 actorPage 보다 먼저 준비되고 늦게 정리된다 — 브라우저 관찰을 끝낸 뒤 계정과 그룹을 지운다.
 */
const test = baseTest.extend<{ subject: AuditActor; auditor: AuditActor }>({
    subject: async ({ playwright, baseURL }, use) => {
        const fixtureRequest = await playwright.request.newContext({ baseURL: requireLoopback(baseURL), ...anonymousCsrfRequestState(requireLoopback(baseURL)) });
        try {
            const subject = await createVisualAdmin(fixtureRequest, baseURL!, { group: 'ROLE_USER' });
            try {
                await use(subject);
            } finally {
                await subject.dispose();
            }
        } finally {
            await fixtureRequest.dispose();
        }
    },
    auditor: async ({ playwright, baseURL }, use) => {
        const fixtureRequest = await playwright.request.newContext({ baseURL: requireLoopback(baseURL), ...anonymousCsrfRequestState(requireLoopback(baseURL)) });
        const administrator = { Authorization: `Bearer ${getAdminBearerToken()}` };
        const groupCode = `E2E_ADT_${randomBytes(4).toString('hex').toUpperCase()}`;
        let groupCreated = false;
        try {
            const created = await fixtureRequest.post(`${AUTHORIZATION}/groups`, {
                headers: administrator, data: { code: groupCode, name: `E2E 감사 원장 열람 ${groupCode}`, description: '감사 로그 여정 전용' },
            });
            groupCreated = created.ok();
            expect(created.status(), '감사 열람 그룹 생성').toBe(201);
            const group = await data<{ version: string }>(await fixtureRequest.get(`${AUTHORIZATION}/groups/${groupCode}`, { headers: administrator }), '감사 열람 그룹 조회');
            const granted = await fixtureRequest.put(`${AUTHORIZATION}/groups/${groupCode}/grants`, {
                headers: administrator,
                data: { grants: [{ type: 'OPERATION', code: 'ADT_LOG_READ' }], version: group.version, complete: true },
            });
            expect(granted.status(), '감사 열람 그룹 기능 권한').toBe(200);

            const auditor = await createVisualAdmin(fixtureRequest, baseURL!);
            try {
                const membershipUrl = `${AUTHORIZATION}/users/${auditor.esntlId}/groups`;
                const membership = await data<{ version: string; groups: string[] }>(
                    await fixtureRequest.get(membershipUrl, { headers: administrator }), '감사 열람 관리자 배정 조회');
                const assigned = await fixtureRequest.put(membershipUrl, {
                    headers: administrator, data: { groups: [...membership.groups, groupCode], version: membership.version, complete: true },
                });
                expect(assigned.status(), '감사 열람 관리자에게 그룹 배정').toBe(200);
                const me = await data<{ permissions: string[] }>(
                    await fixtureRequest.get('/api/v1/auth/me', { headers: auditor.authorization }), '감사 열람 관리자 권한 확인');
                expect(me.permissions).toContain('ADT_LOG_READ');
                await use(auditor);
            } finally {
                await auditor.dispose();
            }
        } finally {
            try {
                if (groupCreated) await deleteGroup(fixtureRequest, administrator, groupCode);
            } finally {
                await fixtureRequest.dispose();
            }
        }
    },
});

test.describe('관측 여정 — 행동이 남긴 기록을 찾는다', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('권한 없는 요청은 실패 요청(시스템) 로그에 그 경로와 응답 코드로 남는다', async ({ page, userRequest, adminRequest }) => {
        const marker = `E2EDENY${randomBytes(4).toString('hex').toUpperCase()}`;
        // 일반 사용자는 공통코드를 읽을 수 없다 — 보안 필터가 핸들러 전에 403 으로 거부하고, 그 요청 경로가 서비스 칸에 남는다.
        const denied = await userRequest.get(`/api/v1/admin/system/codes/cmmn/${marker}`);
        expect(denied.status(), '권한 없는 공통코드 조회').toBe(403);

        await expect.poll(async () => {
            const response = await adminRequest.get('/api/v1/admin/system/logs/system', { params: { searchKeyword: marker, page: 1, size: 10 } });
            if (response.status() !== 200) return -1;
            return Number((await response.json() as { data?: { total?: number } }).data?.total ?? 0);
        }, { message: '실패 요청 로그 도착', timeout: 30_000 }).toBeGreaterThanOrEqual(1);

        await page.goto('/admin/system/logs/system');
        const search = page.getByLabel('서비스 설명 · 요청ID');
        await search.fill(marker);
        await search.press('Enter');
        const row = page.getByRole('table', { name: '시스템 로그 목록' }).getByRole('row').filter({ hasText: marker }).first();
        await expect(row).toBeVisible({ timeout: 20_000 });
        await expect(row).toContainText(`/api/v1/admin/system/codes/cmmn/${marker}`);
        await expect(row).toContainText('403');

        await test.step('서버에서 직접 내려받은 XLSX 끝까지 읽고 같은 실패 요청을 찾는다', async () => {
            const [download] = await Promise.all([
                page.waitForEvent('download'),
                page.getByRole('button', { name: '전체 결과 엑셀 다운로드', exact: true }).click(),
            ]);
            const downloadUrl = new URL(download.url());
            expect(downloadUrl.pathname).toBe('/api/v1/admin/system/logs/system/export.xlsx');
            expect(downloadUrl.searchParams.get('searchKeyword')).toBe(marker);
            expect(download.suggestedFilename()).toBe('system-logs.xlsx');
            // 이 화면은 서버 URL 로 직접 이동한다. download 이벤트 뒤 전송 완료·ZIP 끝·실제 행까지 확인한다.
            const rows = await downloadedXlsxRows(download, page, 'system-logs');
            expect(rows[0]).toEqual(['로그 일련번호', '요청 ID', '서비스명', '메서드명', '처리구분', '처리시간',
                '요청자 ID', '요청 IP', '발생일자', '응답코드', '오류구분', '오류코드']);
            const records = rows.slice(1);
            expect(records.length).toBeGreaterThan(0);
            expect(records.every(record => record[2] === `/api/v1/admin/system/codes/cmmn/${marker}`)).toBe(true);
            expect(records.some(record => record[9] === '403')).toBe(true);
        });
    });

    test('사용자 상세 조회는 개인정보 조회 기록과 감사 원장에 남고, 감사 원장을 조건으로 찾아 사유와 함께 내보낸다', async ({ subject, auditor, actorPage, baseURL }) => {
        // 개인정보 접근 — 일회용 관리자가 정보주체의 상세(연락처·주소·생년월일)를 연다.
        const apiRequest = await playwrightRequest.newContext({ baseURL, ...anonymousCsrfRequestState(baseURL) });
        try {
            const detail = await data<{ esntlId: string }>(
                await apiRequest.get(`/api/v1/admin/system/users/${subject.userId}`, { headers: auditor.authorization }), '정보주체 상세 조회');
            expect(detail.esntlId).toBe(subject.esntlId);
        } finally {
            await apiRequest.dispose();
        }

        const { page } = await actorPage({ storageState: auditor.storageState });

        await test.step('개인정보 조회 기록에 그 조회가 조회자와 함께 남는다', async () => {
            await page.goto('/admin/system/logs/privacy');
            // 표의 열 머리도 같은 이름이라 검색 입력란을 역할로 고른다.
            const search = page.getByRole('textbox', { name: '조회 대상 정보', exact: true });
            await search.fill('사용자 상세');
            await search.press('Enter');
            const row = page.getByRole('table', { name: '개인정보 접근 로그 목록' }).getByRole('row').filter({ hasText: auditor.userId });
            await expect(row.first()).toBeVisible({ timeout: 20_000 });
            await expect(row.first()).toContainText('사용자 상세');
        });

        await test.step('감사 원장을 행위자·작업 종류로 찾으면 응답 준비 단계가 정보주체를 대상으로 남아 있다', async () => {
            await page.goto('/admin/system/logs/audit');
            await expect(page.getByRole('heading', { name: '민감 작업 감사 원장', exact: true })).toBeVisible();
            const operation = page.getByLabel('작업 종류');
            await expect(operation.locator('option[value="UserApiController#getUser"]')).toHaveCount(1);
            await operation.selectOption('UserApiController#getUser');
            const actor = page.getByLabel('행위자 로그인 ID');
            await actor.fill(auditor.userId);
            await actor.press('Enter');
            const ledger = page.getByRole('table', { name: '민감 작업 감사 원장' });
            const prepared = ledger.getByRole('row').filter({ hasText: '응답 준비' }).filter({ hasText: subject.esntlId });
            await expect(prepared).toHaveCount(1, { timeout: 20_000 });
            await expect(prepared).toContainText(auditor.userId);
            await expect(prepared).toContainText('사용자 상세');
        });

        const reason = `E2E 월간 점검 ${randomBytes(3).toString('hex')}`;
        await test.step('같은 조건의 XLSX를 끝까지 받아 준비한 감사 행을 읽는다', async () => {
            await page.getByRole('button', { name: /전체 결과 내보내기/ }).click();
            const dialog = page.getByRole('dialog', { name: '감사 원장 내보내기' });
            await expect(dialog).toContainText('감사 원장에 남습니다');
            await dialog.getByLabel('내보내기 사유').fill(reason);
            const [download] = await Promise.all([
                page.waitForEvent('download'),
                dialog.getByRole('button', { name: '내보내기', exact: true }).click(),
            ]);
            expect(download.suggestedFilename()).toBe('audit-journal.xlsx');
            // 감사 화면은 응답 Blob 을 받은 뒤 저장한다. 저장된 ZIP·워크북·기대 행을 읽어
            // 전송이 잘리거나 필터를 무시하거나 빈 파일을 내는 회귀를 함께 잡는다.
            const rows = await downloadedXlsxRows(download, page, 'audit-journal');
            expect(rows[0]).toEqual(['일련번호', '일시', '작업', '설명', '단계', '행위자 로그인 ID', '대상', '접속 IP', '응답 상태', '요청 ID']);
            const records = rows.slice(1);
            expect(records.length).toBeGreaterThan(0);
            expect(records.every(row => row[2] === 'UserApiController#getUser' && row[5] === auditor.userId)).toBe(true);
            const prepared = records.filter(row => row[4] === 'PREPARED' && row[6] === subject.esntlId);
            expect(prepared).toHaveLength(1);
            expect(prepared[0][3]).toContain('사용자 상세');
        });

        await test.step('내보내기 자체가 사유와 함께 원장에 남는다', async () => {
            // 작업 종류 선택지는 화면을 열 때 읽는다 — 방금 생긴 작업 종류를 고르려면 다시 연다.
            await page.goto('/admin/system/logs/audit');
            const operation = page.getByLabel('작업 종류');
            await expect(operation.locator('option[value="AuditJournalApiController#exportAuditJournal"]')).toHaveCount(1);
            await operation.selectOption('AuditJournalApiController#exportAuditJournal');
            const actor = page.getByLabel('행위자 로그인 ID');
            await actor.fill(auditor.userId);
            await actor.press('Enter');
            const ledger = page.getByRole('table', { name: '민감 작업 감사 원장' });
            await expect(ledger.getByRole('row').filter({ hasText: `사유: ${reason}` }).first()).toBeVisible({ timeout: 20_000 });
        });
    });
});
