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
    <div className="min-h-screen bg-muted/30 p-8 space-y-12">
        <Suspense fallback={
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-10 p-20 text-center animate-in fade-in duration-1000">
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary/20 rounded-lg blur-3xl group-hover:scale-150 transition-transform duration-1000 animate-pulse" />
                    <div className="relative w-32 h-32 bg-card rounded-lg border-2 border-border flex items-center justify-center shadow-2xl transition-all group-hover:rotate-12 group-hover:scale-110">
                        <Loader2 className="w-16 h-11 text-primary animate-spin" strokeWidth={3} />
                    </div>
                </div>
                <div className="space-y-4 relative">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Database className="text-primary w-5 h-5 animate-pulse" />
                        <span className="text-xs font-bold text-primary tracking-[0.2em]">임직원·바로가기 검색</span>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tighter text-foreground leading-tight">검색 결과를 불러오는 중</h1>
                    <p className="text-sm font-bold text-muted-foreground max-w-xs mx-auto tracking-tight leading-relaxed">임직원과 바로가기 검색 결과를 준비하고 있습니다.</p>
                </div>
                <div className="w-64 h-1.5 bg-muted rounded-lg overflow-hidden relative">
                    <div className="absolute inset-0 bg-primary w-1/3 animate-[progress_2s_infinite_ease-in-out]" />
                </div>
            </div>
        }>
            {children}
        </Suspense>
    </div>
  );
};

export default SearchShell;
