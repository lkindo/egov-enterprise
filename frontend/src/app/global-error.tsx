'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { ErrorReference } from '@/app/components/ui/error-reference';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      {/* palette-frozen: bg-slate-950 -- 동결 부채: 시맨틱 토큰 이행 전(종전 색 동결표 승계, DEC-OPS-420) */}
      <body className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        {/* palette-frozen: bg-slate-900 border-rose-500/20 -- 동결 부채: 시맨틱 토큰 이행 전(종전 색 동결표 승계, DEC-OPS-420) */}
        <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/20 p-10 rounded-2xl shadow-2xl space-y-6 text-center">
          {/* palette-frozen: bg-rose-500/10 text-rose-500 -- 동결 부채: 시맨틱 토큰 이행 전(종전 색 동결표 승계, DEC-OPS-420) */}
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            {/* palette-frozen: text-rose-500 -- 동결 부채: 시맨틱 토큰 이행 전(종전 색 동결표 승계, DEC-OPS-420) */}
            <h1 className="text-2xl font-black tracking-tighter text-rose-500">치명적인 시스템 에러</h1>
            <p className="text-sm text-muted-foreground font-bold leading-relaxed">
              애플리케이션 전역 레이어에서 예상치 못한 치명적인 오류가 검출되었습니다.
            </p>
          </div>
          {/* palette-frozen: bg-slate-950 border-slate-800 -- 동결 부채: 시맨틱 토큰 이행 전(종전 색 동결표 승계, DEC-OPS-420) */}
          <div className="bg-slate-950 p-4 rounded-lg text-left text-xs font-mono text-muted-foreground overflow-x-auto border border-slate-800">
            <p className="font-bold text-muted-foreground">오류 세부 정보는 안전하게 숨겨졌습니다.</p>
            <ErrorReference digest={error.digest} className="mt-2 text-muted-foreground" />
          </div>
          <Button
            onClick={() => reset()}
            // palette-frozen: bg-rose-500 bg-rose-600 -- 동결 부채: 시맨틱 토큰 이행 전(종전 색 동결표 승계, DEC-OPS-420)
            className="w-full h-12 bg-rose-500 text-white hover:bg-rose-600 rounded-xl font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> 시스템 리셋 및 복구
          </Button>
        </div>
      </body>
    </html>
  );
}
