
import fs from 'fs';
import { cookies } from 'next/headers';

export default async function debug_cookies() {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    const data = {
        time: new Date().toISOString(),
        cookies: all.map(c => ({ name: c.name, size: c.value.length })),
        accessToken: cookieStore.get('accessToken')?.value ? "PRESENT" : "MISSING"
    };
    fs.appendFileSync('d:/project/egov-enterprise/ssr_debug.log', JSON.stringify(data) + '\n');
}