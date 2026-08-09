import HpcmClient from './HpcmClient';
import { hpcmAdminService, Hpcm } from '@/services/foundation/system/HpcmAdminService';

export default async function HpcmPage() {
    let list: Hpcm[] = [];

    try {
        const res = await hpcmAdminService.getHpcmList();
        list = res.list || [];
    } catch (error) {
        console.error('HPCM Data Fetch Error:', error);
    }

    return <HpcmClient initialData={{ list }} />;
}
