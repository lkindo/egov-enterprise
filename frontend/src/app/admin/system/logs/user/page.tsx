import { Suspense } from 'react';
import type { Metadata } from 'next';
import SystemLogsUserClient from './SystemLogsUserClient';

export const metadata: Metadata = {
    title: '사용자 로그 | 전자정부 엔터프라이즈 포털',
    description: '사용자 활동 로그를 조회하고 검색 조건에 따른 결과를 확인합니다.',
};

export default function Page() {
    // 클라이언트가 useSearchParams(URL 페이지 동기화)를 사용하므로 Suspense 경계가 필요하다.
    return (
        <Suspense fallback={<div className="p-24 text-center text-xs font-bold tracking-widest text-muted-foreground animate-pulse"><h1 className="sr-only">사용자 로그를 불러오는 중</h1>사용자 로그를 불러오는 중...</div>}>
            <SystemLogsUserClient />
        </Suspense>
    );
}
