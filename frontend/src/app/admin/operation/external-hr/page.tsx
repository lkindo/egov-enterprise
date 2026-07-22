import { Suspense } from 'react';
import {
    operationAdminService,
    emptyPage,
    type ExternalHr,
} from '@/services/foundation/operation/OperationAdminService';
import type { PageResponse } from '@/types/foundation/system';
import ExternalHrClient from './ExternalHrClient';

export const metadata = {
    title: '외부인사정보 관리 | 전자정부 프레임워크',
    description: '운영 관리 외부인사 정보를 관리합니다.',
};

const PAGE_SIZE = 10;

export default async function ExternalHrPage() {
    let initialPage: PageResponse<ExternalHr> = emptyPage<ExternalHr>(PAGE_SIZE);
    try {
        // 서버는 0-based Pageable 을 받는다 (page=0 → 1페이지)
        initialPage = await operationAdminService.getExternalHrList({ page: 0, size: PAGE_SIZE });
    } catch (error) {
        console.error('Failed to fetch initial external HR info');
    }

    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">로딩 중..</div>}>
            <ExternalHrClient initialPage={initialPage} />
        </Suspense>
    );
}
