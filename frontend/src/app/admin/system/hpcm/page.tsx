import React from 'react';
import HpcmClient from './HpcmClient';
import { hpcmAdminService } from '@/services/foundation/system/HpcmAdminService';

export default async function HpcmPage() {
    let list = [];

    try {
        const res = await hpcmAdminService.getHpcmList();
        list = res.list || [];
    } catch (error) {
        console.error('HPCM Data Fetch Error:', error);
    }

    return <HpcmClient initialData={{ list }} />;
}
