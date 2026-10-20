import { expect,test } from '../fixtures/api-test';
import { getAdminBearerToken } from '../utils/admin-token';
import { randomBytes } from 'node:crypto';
import { assertIsolatedTarget } from '../../../scripts/e2e-isolation.mjs';
import { anonymousCsrfRequestState } from '../fixtures/csrf';
const SCHEDULE_API = '/api/v1/schedules';
/** 이 스펙이 만든 자원만 지우기 위한 접두사. cleanup 정책과 충돌하지 않게 고유값을 쓴다. */
const PREFIX = 'E2E24_';
test.describe('조직 ↔ 일정 통합 사슬', () => {
    // UI 검증은 저장된 관리자 세션을 재사용한다. 이 선언이 없으면 미인증 상태로 로그인 화면이 뜬다.
    // (API 검증은 아래 Bearer 헤더를 직접 싣는다 — 백엔드는 쿠키를 읽지 않는다.)
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let auth: Record<string, string>;
    test.beforeAll(() => {
        auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
    });
    test('일정 등록 → 월별 조회 노출 → 수정 → 삭제', async ({ request }) => {
        const ymd = '20260715';
        const yearMonth = ymd.slice(0, 6);
        // 1) 등록 — schdlSn(PK)·schdlPicId(담당자)는 보내지 않는다. DB·서버가 채번·고정해야 한다.
        const createRes = await request.post(SCHEDULE_API, {
            headers: auth,
            data: {
                schdlNm: `${PREFIX}Schedule`,
                schdlBgngYmd: ymd,
                schdlEndYmd: ymd,
                schdlSeCd: '2',
            },
        });
        expect(createRes.ok(), '일정 등록이 성공해야 한다').toBeTruthy();
        const schdlSn = (await createRes.json()).data as number;
        expect(schdlSn, 'DB가 채번한 일정 일련번호가 반환되어야 한다').toBeGreaterThan(0);
        // 2) 월별 조회에 노출 — 저장축(schdlPicId)과 조회축이 어긋나면 여기서 사라진다.
        //    ⚠ yearMonth 는 하이픈 없는 6자여야 한다. 'yyyy-MM' 을 보내면 예외 없이 0건이 된다.
        const monthRes = await request.get(`${SCHEDULE_API}/monthly?yearMonth=${yearMonth}`, { headers: auth });
        expect(monthRes.ok()).toBeTruthy();
        interface ScheduleItem {
            schdlSn: number;
            schdlPicId?: string;
            schdlNm?: string;
            version?: number;
        }
        const list = (await monthRes.json()).data as ScheduleItem[];
        const mine = list.find((s) => s.schdlSn === schdlSn);
        expect(mine, '등록한 일정이 월별 조회에 나와야 한다').toBeTruthy();
        expect(mine?.schdlPicId, '담당자는 서버가 인증 주체로 채워야 한다').toBeTruthy();
        // 3) 수정 — 담당자는 재지정되지 않아야 한다(매스어사인먼트 차단).
        const updRes = await request.put(`${SCHEDULE_API}/${schdlSn}`, {
            headers: auth,
            data: {
                schdlNm: `${PREFIX}Schedule_edited`,
                schdlBgngYmd: ymd,
                schdlEndYmd: ymd,
                schdlSeCd: '2',
                schdlPicId: 'attacker',
                // [2026-10-18 V2_133] 수정은 목록에서 읽은 버전을 함께 보낸다.
                version: mine?.version,
            },
        });
        expect(updRes.ok(), '일정 수정이 성공해야 한다').toBeTruthy();
        const afterRes = await request.get(`${SCHEDULE_API}/${schdlSn}`, { headers: auth });
        expect(afterRes.ok()).toBeTruthy();
        const after = (await afterRes.json()).data;
        expect(after.schdlNm).toBe(`${PREFIX}Schedule_edited`);
        expect(after.schdlPicId, '담당자는 요청 값으로 바뀌지 않아야 한다').not.toBe('attacker');
        // 4) 삭제
        expect((await request.delete(`${SCHEDULE_API}/${schdlSn}`, { headers: auth })).ok()).toBeTruthy();
        const goneRes = await request.get(`${SCHEDULE_API}/monthly?yearMonth=${yearMonth}`, { headers: auth });
        const goneList = (await goneRes.json()).data as ScheduleItem[];
        expect(goneList.find((s) => s.schdlSn === schdlSn), '삭제한 일정은 조회되지 않아야 한다').toBeFalsy();
    });

    test('READ_ALL 없는 동료는 같은 부서 공유 일정과 첨부만 읽고 모든 비소유 쓰기는 차단된다', async ({ adminRequest, playwright }) => {
        const target = await assertIsolatedTarget();
        const actors = await playwright.request.newContext({ baseURL: `${target.apiUrl}/`, ...anonymousCsrfRequestState(`${target.apiUrl}/`), maxRedirects: 0 });
        const suffix = randomBytes(4).toString('hex');
        const departments: string[] = []; const users: string[] = []; const schedules: number[] = [];
        const fileGroups: number[] = [];
        type FileItem = { atchFileSn: number; fileSn: number; orignlFileNm: string; fileMg: number };
        try {
            for (const label of ['Same', 'Other']) {
                const response = await adminRequest.post('/api/v1/admin/system/departments', { data: { ognzNm: `E2E Schedule ${label} ${suffix}` } });
                expect(response.status()).toBe(201); const id = (await response.json()).data as string;
                expect(id).toBeTruthy(); departments.push(id);
            }
            const authorizations: Record<string, string>[] = [];
            for (const [index, label] of ['owner', 'colleague', 'other'].entries()) {
                const userId = `e2e_sc_${label.slice(0, 3)}_${suffix}`;
                const password = `Aa1!${randomBytes(16).toString('hex')}`;
                const department = departments[index === 2 ? 1 : 0];
                const response = await adminRequest.post('/api/v1/admin/system/users', {
                    data: { userId, userNm: `E2E Schedule ${label}`, pswd: password, role: 'USER', ognzId: department },
                });
                expect(response.status()).toBe(201); users.push(userId);
                const details = await adminRequest.get(`/api/v1/admin/system/users/${userId}`); expect(details.status()).toBe(200);
                const saved = (await details.json()).data as { esntlId: string; ognzId: string };
                expect(saved.ognzId).toBe(department);
                const groups = await adminRequest.get(`/api/v1/admin/authorization/users/${saved.esntlId}/groups`); expect(groups.status()).toBe(200);
                expect((await groups.json()).data.groups).toEqual(['ROLE_USER']);
                const login = await actors.post('/api/v1/auth/login', { data: { userId, password } }); expect(login.status(), `로그인 실패: ${await login.text()}`).toBe(200);
                const token = (await login.json()).data.accessToken as string; expect(typeof token).toBe('string'); expect(token.length).toBeGreaterThan(0);
                const headers = { Authorization: `Bearer ${token}` }; authorizations.push(headers);
                const current = await actors.get('/api/v1/auth/me', { headers }); expect(current.status()).toBe(200);
                const principal = (await current.json()).data as { id: string; groups: string[]; permissions: string[] };
                expect(principal.id).toBe(userId); expect(principal.groups).toEqual(['ROLE_USER']);
                expect(principal.permissions).toContain('SCHEDULE_READ');
                expect(principal.permissions).not.toContain('SCHEDULE_READ_ALL');
                expect(principal.permissions).not.toContain('SCHEDULE_WRITE_ALL');
                expect(principal.permissions).toEqual(expect.arrayContaining(['FILE_UPLOAD', 'FILE_READ', 'FILE_DOWNLOAD', 'FILE_DELETE']));
                expect(principal.permissions).not.toContain('FILE_READ_ALL');
                expect(principal.permissions).not.toContain('FILE_DELETE_ALL');
            }
            const [owner, colleague, other] = authorizations;
            const ymd = '20261015'; const yearMonth = ymd.slice(0, 6);
            const upload = async (label: string) => {
                const name = `${PREFIX}${label}_${suffix}.txt`;
                const bytes = Buffer.from(`Schedule attachment ${label} ${suffix}\nOnly the intended readers receive these bytes.\n`, 'utf8');
                const response = await actors.post('/api/v1/files', { headers: owner,
                    multipart: { files: { name, mimeType: 'text/plain', buffer: bytes } } });
                expect(response.status()).toBe(201);
                const atchFileSn = (await response.json()).data as number;
                expect(Number.isSafeInteger(atchFileSn)).toBe(true); expect(atchFileSn).toBeGreaterThan(0);
                fileGroups.push(atchFileSn);
                const list = await actors.get(`/api/v1/files/${atchFileSn}`, { headers: owner }); expect(list.status()).toBe(200);
                const items = (await list.json()).data as FileItem[];
                expect(items).toHaveLength(1);
                expect(items[0]).toMatchObject({ atchFileSn, orignlFileNm: name, fileMg: bytes.length });
                expect(Number.isSafeInteger(items[0].fileSn)).toBe(true);
                return { atchFileSn, fileSn: items[0].fileSn, name, bytes };
            };
            const create = async (sharing: string, atchFileSn: number) => {
                const response = await actors.post(SCHEDULE_API, { headers: owner,
                    data: { schdlNm: `${PREFIX}${sharing}_${suffix}`, schdlBgngYmd: ymd, schdlEndYmd: ymd, schdlSeCd: sharing, atchFileSn } });
                expect(response.status()).toBe(201); const id = (await response.json()).data as number;
                expect(Number.isSafeInteger(id)).toBe(true); expect(id).toBeGreaterThan(0); schedules.push(id); return id;
            };
            // 공유·개인 일정이 같은 파일을 참조하면 any-readable 정책 때문에 개인 첨부 검증이 무효가 된다.
            const sharedFile = await upload('shared'); const privateFile = await upload('private');
            expect(sharedFile.atchFileSn).not.toBe(privateFile.atchFileSn);
            const shared = await create('1', sharedFile.atchFileSn);
            const privateSchedule = await create('2', privateFile.atchFileSn);
            const month = await actors.get(`${SCHEDULE_API}/monthly?yearMonth=${yearMonth}`, { headers: colleague }); expect(month.status()).toBe(200);
            const rows = (await month.json()).data as { schdlSn: number; editable: boolean; deletable: boolean }[];
            const visible = rows.find(row => row.schdlSn === shared); expect(visible).toBeTruthy();
            expect(visible?.editable).toBe(false); expect(visible?.deletable).toBe(false);
            expect(rows.some(row => row.schdlSn === privateSchedule)).toBe(false);
            const readable = await actors.get(`${SCHEDULE_API}/${shared}`, { headers: colleague }); expect(readable.status()).toBe(200);
            const detail = (await readable.json()).data as { schdlNm: string; schdlDeptId: string; schdlPicId: string; editable: boolean; deletable: boolean };
            expect(detail.schdlDeptId).toBe(departments[0]); expect(detail.schdlPicId).toBe(users[0]);
            expect(detail.editable).toBe(false); expect(detail.deletable).toBe(false);
            for (const actor of [
                { name: 'owner', headers: owner, shared: true, private: true },
                { name: 'same department', headers: colleague, shared: true, private: false },
                { name: 'other department', headers: other, shared: false, private: false },
            ]) {
                for (const resource of [
                    { id: shared, file: sharedFile, allowed: actor.shared },
                    { id: privateSchedule, file: privateFile, allowed: actor.private },
                ]) {
                    const expectedStatus = resource.allowed ? 200 : 403;
                    const body = await actors.get(`${SCHEDULE_API}/${resource.id}`, { headers: actor.headers });
                    expect(body.status(), `${actor.name}: 일정 본문`).toBe(expectedStatus);
                    const list = await actors.get(`/api/v1/files/${resource.file.atchFileSn}`, { headers: actor.headers });
                    expect(list.status(), `${actor.name}: 일정 첨부 목록`).toBe(expectedStatus);
                    const download = await actors.get(`/api/v1/files/${resource.file.atchFileSn}/${resource.file.fileSn}`, { headers: actor.headers });
                    expect(download.status(), `${actor.name}: 일정 첨부 다운로드`).toBe(expectedStatus);
                    if (resource.allowed) {
                        expect((await body.json()).data.atchFileSn).toBe(resource.file.atchFileSn);
                        expect((await list.json()).data).toEqual([
                            expect.objectContaining({ atchFileSn: resource.file.atchFileSn, fileSn: resource.file.fileSn,
                                orignlFileNm: resource.file.name, fileMg: resource.file.bytes.length }),
                        ]);
                        expect((await download.body()).equals(resource.file.bytes), `${actor.name}: 원본 파일 바이트`).toBe(true);
                    }
                }
            }
            const otherMonth = await actors.get(`${SCHEDULE_API}/monthly?yearMonth=${yearMonth}`, { headers: other }); expect(otherMonth.status()).toBe(200);
            expect(((await otherMonth.json()).data as { schdlSn: number }[]).some(row => schedules.includes(row.schdlSn))).toBe(false);
            for (const headers of [colleague, other]) {
                const changed = await actors.put(`${SCHEDULE_API}/${shared}`, { headers,
                    data: { schdlNm: 'forbidden edit', schdlBgngYmd: ymd, schdlEndYmd: ymd, schdlSeCd: '1' } }); expect(changed.status()).toBe(403);
                expect((await actors.delete(`${SCHEDULE_API}/${shared}`, { headers })).status()).toBe(403);
                expect((await actors.delete(`/api/v1/files/${sharedFile.atchFileSn}/${sharedFile.fileSn}`, { headers })).status()).toBe(403);
            }
            const preserved = await actors.get(`${SCHEDULE_API}/${shared}`, { headers: owner }); expect(preserved.status()).toBe(200);
            const after = (await preserved.json()).data;
            expect(after.schdlNm).toBe(detail.schdlNm); expect(after.schdlPicId).toBe(users[0]);
            expect(after.editable).toBe(true); expect(after.deletable).toBe(true);
        } finally {
            const failures: unknown[] = [];
            const cleanup = async (operation: () => Promise<void>) => {
                try { await operation(); } catch (error) { failures.push(error); }
            };
            try {
                for (const id of schedules.reverse()) await cleanup(async () => {
                    expect((await adminRequest.delete(`${SCHEDULE_API}/${id}`)).status()).toBe(200);
                });
                for (const id of fileGroups.reverse()) await cleanup(async () => {
                    const list = await adminRequest.get(`/api/v1/files/${id}`); expect(list.status()).toBe(200);
                    for (const item of (await list.json()).data as FileItem[]) {
                        expect((await adminRequest.delete(`/api/v1/files/${id}/${item.fileSn}`)).status()).toBe(200);
                    }
                });
                for (const id of users.reverse()) await cleanup(async () => {
                    expect((await adminRequest.delete(`/api/v1/admin/system/users/${id}`)).status()).toBe(200);
                });
                for (const id of departments.reverse()) await cleanup(async () => {
                    expect((await adminRequest.delete(`/api/v1/admin/system/departments/${id}`)).status()).toBe(200);
                });
            } finally { await actors.dispose(); }
            if (failures.length) throw new AggregateError(failures, '일정 첨부 시험이 만든 자원을 모두 정리하지 못했습니다.');
        }
    });
});
