import { Suspense } from 'react';
import {
    operationAdminService,
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
    // 프리페치 실패를 '빈 페이지'로 바꿔치기하면 화면이 "데이터 0건"으로 거짓말한다(감사 P1-1).
    // 실패 시 null 을 넘겨 클라이언트가 직접 재조회하고, 실패하면 error/onRetry 로 화면에 드러내게 한다.
    let initialPage: PageResponse<ExternalHr> | null = null;
    try {
        // 서버는 0-based Pageable 을 받는다 (page=0 → 1페이지)
        initialPage = await operationAdminService.getExternalHrList({ page: 0, size: PAGE_SIZE });
    } catch (error) {
        console.error('Failed to fetch initial external HR info', error);
    }

    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">로딩 중..</div>}>
            <ExternalHrClient initialPage={initialPage} />
        </Suspense>
    );
}
