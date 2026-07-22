import React, { Suspense } from 'react';
import SystemLogsSystemClient from './SystemLogsSystemClient';

export default function Page() {
    // 클라이언트가 useSearchParams(URL 페이지 동기화)를 사용하므로 Suspense 경계가 필요하다.
    return (
        <Suspense fallback={<div className="p-24 text-center text-xs font-bold tracking-widest text-muted-foreground animate-pulse">시스템 로그를 불러오는 중...</div>}>
            <SystemLogsSystemClient />
        </Suspense>
    );
}
