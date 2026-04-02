import { Suspense } from 'react';
import { operationAdminService } from '@/services/foundation/operation/OperationAdminService';
import ExternalHrClient from './ExternalHrClient';

export const metadata = {
    title: '?몃님몄궗?뺣낫 관리| ?꾩옄?뺣? ?쒖님꾨젅?꾩썙님,
    description: '?됱궗 愿님?몃님몄궗 ?뺣낫瑜관리ы빀?덈떎.',
};

export default async function ExternalHrPage() {
    let initialData: any[] = [];
    try {
        const res = await operationAdminService.getExternalHrList();
        initialData = res.list || [];
    } catch {
        console.error('Failed to fetch initial external HR info:');
    }

    return (
        <Suspense fallback={<div>濡쒕뵫 중..</div>}>
            <ExternalHrClient initialData={initialData} />
        </Suspense>
    );
}

