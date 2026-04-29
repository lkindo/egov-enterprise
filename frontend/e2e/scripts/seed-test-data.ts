import axios from 'axios';

const API_BASE = 'http://localhost:8080/api/v1';
const ADMIN_ID = 'webmaster';
const ADMIN_PW = '1';

export class SeedingService {
    private token: string = '';
    private cookieList: string[] = [];
    private xsrfToken: string = '';

    async authenticate() {
        console.log('>>> [Seeder] Authenticating as admin...');
        const loginRes = await axios.post(`${API_BASE}/auth/login`, { userId: ADMIN_ID, password: ADMIN_PW });
        this.token = loginRes.data.data.accessToken;

        const meRes = await axios.get(`${API_BASE}/users/me`, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });

        const rawCookies = meRes.headers['set-cookie'] || loginRes.headers['set-cookie'] || [];
        for (const cookie of rawCookies) {
            const parts = cookie.split(';')[0];
            this.cookieList.push(parts);
            if (parts.startsWith('XSRF-TOKEN=')) {
                this.xsrfToken = parts.split('=')[1];
            }
        }
        console.log('>>> [Seeder] Authentication successful.');
    }

    private getHeaders() {
        const headers: any = {
            'Authorization': `Bearer ${this.token}`,
            'Cookie': this.cookieList.join('; '),
            'X-Requested-With': 'XMLHttpRequest'
        };
        if (this.xsrfToken) headers['X-XSRF-TOKEN'] = this.xsrfToken;
        return headers;
    }

    async seedCommonCode(codeId: string, codeNm: string) {
        console.log(`>>> [Seeder] Seeding Common Code: ${codeId}`);
        await axios.post(`${API_BASE}/admin/system/codes`, {
            codeId,
            codeNm,
            codeDc: 'E2E Seeded Code',
            useAt: 'Y'
        }, { headers: this.getHeaders() });
    }

    async seedBoardPost(bbsId: string, title: string, content: string) {
        console.log(`>>> [Seeder] Seeding Board Post in ${bbsId}: ${title}`);
        await axios.post(`${API_BASE}/boards/${bbsId}/posts`, {
            nttSj: title,
            nttCn: content,
            noticeAt: 'N',
            secretAt: 'N',
            useAt: 'Y'
        }, { headers: this.getHeaders() });
    }
}

export default new SeedingService();
