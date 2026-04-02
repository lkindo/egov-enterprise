import { Suspense } from 'react';
import { operationAdminService } from '@/services/foundation/operation/OperationAdminService';
import ExternalHrClient from './ExternalHrClient';

export const metadata = {
    title: '외부인사정보 관리 | 전자정부 프레임워크',
    description: '운영 관리 외부인사 정보를 관리합니다.',
};

export default async function ExternalHrPage() {
    let initialData: any[] = [];
    try {
        const res = await operationAdminService.getExternalHrList();
        initialData = res.list || [];
    } catch (error) {
        console.error('Failed to fetch initial external HR info');
    }

    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">로딩 중..</div>}>
            <ExternalHrClient initialData={initialData} />
        </Suspense>
    );
}
