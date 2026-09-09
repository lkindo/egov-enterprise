import { randomBytes } from 'node:crypto';
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminBearerToken } from '../utils/admin-token';

/** VRT가 다른 테스트의 결재·댓글 알림을 받지 않도록 실제 사용자와 세션을 분리한다. */
export async function createVisualAdmin(request: APIRequestContext, baseURL: string) {
    const origin = new URL(baseURL);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) {
        throw new Error('Visual admin fixtures require an isolated loopback E2E stack.');
    }
    const userId = `e2e_vrt_${randomBytes(5).toString('hex')}`;
    const password = `Vrt1!${randomBytes(16).toString('hex')}`;
    const adminHeaders = { Authorization: `Bearer ${getAdminBearerToken()}` };
    const created = await request.post('/api/v1/admin/system/users', {
        headers: adminHeaders,
        data: { userId, pswd: password, userNm: '최고관리자', role: 'ADMIN' },
    });
    expect(created.status(), '시각 검증 전용 관리자 생성').toBe(200);

    const dispose = async () => {
        const response = await request.delete(`/api/v1/admin/system/users/${userId}`, {
            headers: adminHeaders,
        });
        expect(response.status(), '시각 검증 전용 관리자 정리').toBe(200);
    };
    try {
        const login = await request.post('/api/v1/auth/login', {
            data: { userId, password },
        });
        expect(login.status(), '시각 검증 전용 관리자 로그인').toBe(200);
        const token: unknown = (await login.json())?.data?.accessToken;
        if (typeof token !== 'string' || token.length === 0) {
            throw new Error('Visual admin authentication did not return an access token.');
        }
        return {
            authorization: { Authorization: `Bearer ${token}` },
            storageState: {
                cookies: [{
                    name: 'accessToken', value: token, domain: origin.hostname, path: '/',
                    expires: -1, httpOnly: true, secure: true, sameSite: 'Strict' as const,
                }],
                origins: [{
                    origin: origin.origin,
                    localStorage: [{ name: 'egov_smart_tour_v1', value: 'true' }],
                }],
            },
            dispose,
        };
    } catch (error) {
        await dispose();
        throw error;
    }
}
