'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/20 p-10 rounded-2xl shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tighter text-rose-500">치명적인 시스템 에러</h2>
            <p className="text-sm text-slate-400 font-bold leading-relaxed">
              애플리케이션 전역 레이어에서 예상치 못한 치명적인 오류가 검출되었습니다.
            </p>
          </div>
          <div className="bg-slate-950 p-4 rounded-lg text-left text-xs font-mono text-slate-500 overflow-x-auto border border-slate-800">
            <p className="font-bold text-slate-400">Error: {error.message || 'Unknown global failure'}</p>
            {error.digest && <p className="opacity-50 mt-1">Digest: {error.digest}</p>}
          </div>
          <Button
            onClick={() => reset()}
            className="w-full h-12 bg-rose-500 text-white hover:bg-rose-600 rounded-xl font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> 시스템 리셋 및 복구
          </Button>
        </div>
      </body>
    </html>
  );
}
