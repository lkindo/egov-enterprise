import { Suspense } from 'react';
import { Loader2, Database } from 'lucide-react';

/**
 * 검색 화면의 **정적 셸**.
 *
 * <p>[2026-08-12] 종전에는 `'use client'` 컴포넌트가 `SearchResultsContent` 를 직접 렌더했다.
 * 이제 검색어 의존 부분은 `children`(= `SearchResultsSlot`, 서버 컴포넌트)으로 주입받고,
 * 이 셸 자체는 **요청 정보를 전혀 읽지 않는다**. 그래서 이 마크업과 아래 폴백은 PPR 로
 * 그대로 프리렌더되고, 검색어에 의존하는 부분만 홀(hole)로 남아 스트리밍된다.
 *
 * <p>클라이언트 훅을 쓰지 않으므로 `'use client'` 도 필요 없다 —
 * 경계를 최대한 안쪽으로 밀어 정적으로 굳는 범위를 넓힌다(프론트 헌법 제3조 서버 컴포넌트 우선).
 */
const SearchShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-muted/20">
        {/*
          [2026-09-08] 전면 히어로 로딩(80vh·w-32 로더·text-4xl·펄스 블러·가짜 진행바)을 걷고
          업무 화면 로딩으로 줄였다. 이 화면은 결과를 기다리는 중간 상태이지 랜딩이 아니다.
          진행바는 실제 진행률을 모르는 채 움직이던 장식이라 함께 제거했다.
        */}
        <Suspense fallback={
            <div className="mx-auto flex max-w-[var(--page-max-w)] flex-col items-center gap-3 p-[var(--page-pad)] py-20 text-center">
                <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
                <div className="flex items-center gap-2">
                    <Database className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-[length:var(--font-size-body)] font-semibold text-muted-foreground">임직원·바로가기 검색</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">검색 결과를 불러오는 중</h1>
                <p className="text-[length:var(--font-size-body)] text-muted-foreground">임직원과 바로가기 검색 결과를 준비하고 있습니다.</p>
            </div>
        }>
            {children}
        </Suspense>
    </div>
  );
};

export default SearchShell;
