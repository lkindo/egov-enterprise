import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function check() {
    const adminFile = path.resolve('playwright/.auth/admin.json');
    const authData = JSON.parse(fs.readFileSync(adminFile, 'utf-8'));
    const token = authData.cookies.find((c: any) => c.name === 'accessToken')?.value;
    
    console.log('>>> Fetching audit logs...');
    try {
        const response = await axios.get('http://localhost:3001/api/v1/admin/system/logs/system', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('>>> Response Status:', response.status);
        console.log('>>> Data Count:', response.data.data.total);
        console.log('>>> First Item:', JSON.stringify(response.data.data.list[0], null, 2));
    } catch (e: any) {
        console.error('>>> Error:', e.response?.status, e.response?.data || e.message);
    }
}

check().catch(console.error);
