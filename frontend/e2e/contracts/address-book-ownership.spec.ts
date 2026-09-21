import fs from 'fs';
import path from 'path';
import { expect,test } from '../fixtures/api-test';
const USER_AUTH = path.join(__dirname, '..', '..', 'playwright', '.auth', 'user.json');
const ADMIN_AUTH = path.join(__dirname, '..', '..', 'playwright', '.auth', 'admin.json');
// [2026-07-28 정정] 백엔드 주소를 하드코딩하고 있었다. auth.setup.ts·cleanup-db.ts 는 이미
//   `process.env.NEXT_PUBLIC_API_URL || 기본값` 패턴을 쓰는데 이 파일만 예외였고, 그 결과
//   백엔드를 다른 포트에 띄우면 **그 포트를 점유한 무관한 서비스로 요청이 새어** RBAC 단언이
//   거짓 통과/거짓 실패한다(실측: 8080 을 다른 앱이 물고 있을 때 모든 경로가 200 을 돌려줘
//   "admin 엔드포인트가 비관리자에게 노출됨" 으로 3건이 red 가 됐다).
//   보안 단언이 환경에 따라 뒤집히는 것은 게이트로서 치명적이므로 저장소 표준 패턴에 맞춘다.
const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
function readCookieValue(authFile: string, name: string): string {
    const data = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    return data.cookies.find((c: {
        name: string;
        value: string;
    }) => c.name === name)?.value ?? '';
}
function readAccessToken(authFile: string): string {
    return readCookieValue(authFile, 'accessToken');
}
// ─────────── E6: IDOR — 다른 사용자의 리소스에 접근할 수 없다 (인증된 비소유자) ───────────
//
// [2026-08-11 신설] 이 파일 상단 TODO 에 오래 남아 있던 항목이고, 22-deep-security-guard 는
//   파일 이름으로 IDOR 를 표방했지만 실제로 검증하던 것은 **경로 RBAC** 였다(#380 에서 이관·정리).
//   즉 "인증된 사용자가 남의 리소스에 손댈 수 있는가" 는 지금까지 **한 번도 검증된 적이 없다.**
//
// [대상 선정] 주소록을 고른 이유는 서비스 코드가 스스로 IDOR 를 명시한 유일한 곳이기 때문이다:
//     AddressBookService: assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 수정(PII)
//   PII 를 담는 자원이라 유출 시 피해가 크고, 상세·수정·삭제 세 경로에 가드가 걸려 있어
//   "읽기만 막고 쓰기는 뚫린" 류의 부분 결함까지 한 번에 잡을 수 있다.
//
// [왜 세 번째 계정을 만드는가] 저장소에 준비된 계정은 webmaster(관리자)·TEST1(일반) 둘뿐이다.
//   관리자는 설계상 남의 자원에 접근할 수 있으므로(assertOwnerOr**Admin**) IDOR 검증에 쓸 수 없다.
//   **비관리자 두 명**이 필요하므로 공격자 계정을 만들고 finally 에서 회수한다.
test.describe('IDOR (authenticated non-owner)', () => {
    // storageState 를 지정하지 않는다 — 세 주체(관리자·피해자·공격자)의 토큰을 요청마다
    // 명시적으로 실어야 "어느 주체로 판정됐는지" 가 분명해진다(E4 와 같은 이유).
    const ADBK_API = `${API}/address-books`;
    test('사용자 A 의 주소록을 사용자 B 가 조회·수정·삭제할 수 없고 원본이 보존된다', async ({ request }) => {
        const adminToken = readAccessToken(ADMIN_AUTH);
        const victimToken = readAccessToken(USER_AUTH); // TEST1
        expect(adminToken && victimToken, 'auth setup 산출물에서 토큰을 얻지 못했다').toBeTruthy();
        const stamp = Date.now().toString().slice(-8);
        const adbkNm = `E2E23_IDOR_${stamp}`;
        // cleanup-db.ts 는 'e2e_' 접두사 사용자를 청소 대상으로 삼는다 — 그 규약에 맞춘다.
        // (그럼에도 finally 에서 직접 지운다. 청소 스크립트에 의존해 쓰레기를 남기지 않는다.)
        const attackerId = `e2e_idor_${stamp}`;
        const attackerPw = 'E2eIdor1!'; // UserDto.pswd 의 @Pattern 충족
        const asAdmin = { Authorization: `Bearer ${adminToken}` };
        const asVictim = { Authorization: `Bearer ${victimToken}` };
        let adbkSn: number | undefined;
        let attackerCreated = false;
        try {
            // ── 1) 공격자 계정 생성 (관리자 권한)
            const created = await request.post(`${API}/admin/system/users`, {
                headers: asAdmin,
                data: { userId: attackerId, pswd: attackerPw, userNm: 'E2E IDOR Attacker', role: 'USER' },
            });
            expect(created.ok(), `공격자 계정 생성 실패: ${created.status()}`).toBeTruthy();
            attackerCreated = true;
            // ── 2) 공격자 로그인 → 유효한 비관리자 토큰 확보
            const login = await request.post(`${API}/auth/login`, {
                data: { userId: attackerId, password: attackerPw },
            });
            expect(login.ok(), `공격자 로그인 실패: ${login.status()}`).toBeTruthy();
            const attackerToken = (await login.json())?.data?.accessToken;
            expect(attackerToken, '공격자 accessToken 을 받지 못했다').toBeTruthy();
            const asAttacker = { Authorization: `Bearer ${attackerToken}` };
            // ── 3) 피해자(A)가 주소록을 만든다
            const mk = await request.post(ADBK_API, {
                headers: asVictim,
                data: { adbkNm, rlsScopeCd: 'G', useYn: 'Y' },
            });
            expect(mk.ok(), `피해자 주소록 생성 실패: ${mk.status()}`).toBeTruthy();
            // 등록 API 는 식별자를 돌려주지 않는다(ApiResponse<Void>) — 고유 명칭으로 되찾는다.
            const listRes = await request.get(`${ADBK_API}?searchWrd=${encodeURIComponent(adbkNm)}&size=100`, {
                headers: asVictim,
            });
            expect(listRes.ok()).toBeTruthy();
            const listBody = await listRes.json();
            const list = listBody?.data?.list ?? listBody?.data?.content ?? [];
            adbkSn = (list as {
                adbkSn: number;
                adbkNm: string;
            }[])
                .find((a) => a.adbkNm === adbkNm)?.adbkSn;
            expect(adbkSn, '생성한 주소록을 목록에서 되찾지 못했다').toBeDefined();
            // ── 4) 공격자(B)가 세 경로 모두에서 막혀야 한다
            //    ⚠ 세 개를 함께 보는 이유: 읽기만 막고 쓰기는 뚫린 부분 결함을 놓치지 않기 위해서다.
            const read = await request.get(`${ADBK_API}/${adbkSn}`, { headers: asAttacker });
            expect(read.status(), '남의 주소록 상세가 열렸다 (PII 유출)').toBe(403);
            const write = await request.put(`${ADBK_API}/${adbkSn}`, {
                headers: asAttacker,
                data: { adbkNm: `${adbkNm}_HACKED`, rlsScopeCd: 'G', useYn: 'Y' },
            });
            expect(write.status(), '남의 주소록이 수정됐다').toBe(403);
            const del = await request.delete(`${ADBK_API}/${adbkSn}`, { headers: asAttacker });
            expect(del.status(), '남의 주소록이 삭제됐다').toBe(403);
            // ── 5) 차단만으로는 부족하다 — 원본이 그대로인지 소유자로 확인한다.
            //    403 을 돌려주면서 side effect 는 남기는 구현이 실재하므로(가드가 저장 뒤에 있으면)
            //    "막혔다" 와 "바뀌지 않았다" 를 따로 단언한다.
            const after = await request.get(`${ADBK_API}/${adbkSn}`, { headers: asVictim });
            expect(after.ok(), '소유자가 자기 주소록을 열지 못한다 — 과잉차단 회귀').toBeTruthy();
            expect((await after.json())?.data?.adbkNm, '공격자의 수정이 반영됐다').toBe(adbkNm);
        }
        finally {
            if (adbkSn !== undefined)
                await request.delete(`${ADBK_API}/${adbkSn}`, { headers: asVictim });
            if (attackerCreated) {
                await request.delete(`${API}/admin/system/users/${attackerId}`, { headers: asAdmin });
            }
        }
    });
});
