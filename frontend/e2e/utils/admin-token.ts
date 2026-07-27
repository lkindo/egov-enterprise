import fs from 'fs';
import path from 'path';

/**
 * storageState(admin.json)에 저장된 accessToken(JWT)을 추출한다.
 *
 * 백엔드 JwtTokenProvider.resolveToken 은 `Authorization: Bearer` 헤더만 읽고 쿠키는 무시한다.
 * 따라서 APIRequestContext(`request`)에 쿠키가 실려 있어도 인증이 서지 않는다(→ 익명 취급).
 * API 로 사전 데이터를 만들어야 하는 테스트는 토큰을 명시적으로 헤더에 실어야 한다.
 *
 * 동일 함수가 19·22·24·25 스펙에 각각 복제돼 있다. 새로 쓰는 곳은 이 공용 구현을 쓴다
 * (기존 4곳의 일괄 치환은 하지 않는다 — 의미 차이를 확인하지 않은 sweep 은 이 저장소가 배제한다).
 */
export function getAdminBearerToken(): string {
    const authPath = path.resolve('playwright/.auth/admin.json');
    const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const cookieToken = (state.cookies ?? []).find((c: { name: string }) => c.name === 'accessToken')?.value;
    const lsToken = (state.origins?.[0]?.localStorage ?? []).find(
        (l: { name: string }) => l.name === 'accessToken',
    )?.value;
    const token = cookieToken ?? lsToken;
    if (!token) {
        throw new Error('admin accessToken 을 playwright/.auth/admin.json 에서 찾을 수 없음 (auth.setup 미실행?)');
    }
    return token;
}
