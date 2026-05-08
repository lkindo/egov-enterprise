'use client';

import React, { Suspense } from 'react';
import { SearchResultsContent } from './SearchClient';
import { Loader2, Database } from 'lucide-react';

const IntegratedSearchPage = () => {
  return (
    <div className="min-h-screen bg-slate-50/30 p-8 space-y-12">
        <Suspense fallback={
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-10 p-20 text-center animate-in fade-in duration-1000">
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary/20 rounded-lg blur-3xl group-hover:scale-150 transition-transform duration-1000 animate-pulse" />
                    <div className="relative w-32 h-32 bg-white rounded-[0.1rem] border-2 border-slate-100 flex items-center justify-center shadow-2xl transition-all group-hover:rotate-12 group-hover:scale-110">
                        <Loader2 className="w-16 h-11 text-primary animate-spin" strokeWidth={3} />
                    </div>
                </div>
                <div className="space-y-4 relative">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Database className="text-primary w-5 h-5 animate-pulse" />
                        <span className="text-xs font-bold text-primary uppercase tracking-[0.4em] font-mono">Neural Search Indexing</span>
                    </div>
                    <h2 className="text-4xl font-bold tracking-tighter text-slate-900 leading-tight">데이터 인구조사 분석 중...</h2>
                    <p className="text-sm font-bold text-slate-300 max-w-xs mx-auto tracking-tight uppercase leading-relaxed font-mono">실시간 분산 검색 인덱스에서 최적의 파라미터를 추출하고 있습니다.</p>
                </div>
                <div className="w-64 h-1.5 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div className="absolute inset-0 bg-primary w-1/3 animate-[progress_2s_infinite_ease-in-out]" />
                </div>
            </div>
        }>
            <SearchResultsContentWithInitial />
        </Suspense>
    </div>
  );
};

// Internal wrapper to handle search params in client component context safely
function SearchResultsContentWithInitial() {
    // In actual implementation, we might use useSearchParams() here if needed,
    // but the SearchResultsContent already handles its own logic.
    // Normalized the Article/User/Menu categories to fix Korean encoding issues.
    const emptyResults = { articles: [], users: [], menus: [] };
    
    return <SearchResultsContent initialResults={emptyResults} query="" />;
}

export default IntegratedSearchPage;
