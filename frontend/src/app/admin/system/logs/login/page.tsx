import { Suspense } from 'react';
import SystemLogsLoginClient from './SystemLogsLoginClient';

export default function Page() {
    // 클라이언트가 useSearchParams(URL 페이지 동기화)를 사용하므로 Suspense 경계가 필요하다.
    return (
        <Suspense fallback={<div className="p-24 text-center text-xs font-bold tracking-widest text-muted-foreground animate-pulse"><h1 className="sr-only">로그인 로그를 불러오는 중</h1>로그인 로그를 불러오는 중...</div>}>
            <SystemLogsLoginClient />
        </Suspense>
    );
}
