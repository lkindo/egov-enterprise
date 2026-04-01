import { Suspense } from 'react';
import { operationAdminService } from '@/services/foundation/operation/OperationAdminService';
import ExternalHrClient from './ExternalHrClient';

export const metadata = {
    title: '?¸ë??¸ì‚¬?•ë³´ ê´€ë¦?| ?„ì?•ë? ?œì??„ë ˆ?„ì›Œ??,
    description: '?‰ì‚¬ ê´€???¸ë??¸ì‚¬ ?•ë³´ë¥?ê´€ë¦¬í•©?ˆë‹¤.',
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
        <Suspense fallback={<div>ë¡œë”© ì¤?..</div>}>
            <ExternalHrClient initialData={initialData} />
        </Suspense>
    );
}
