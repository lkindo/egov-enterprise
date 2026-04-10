'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw, Home, MessageSquare } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // 에러 로그 기록 (실제 서비스에서는 Sentry 등에 전송)
        console.error('Global Error:', error);
    }, [error]);

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-destructive/5 rounded-full blur-[120px] -z-10" />

            <div className="max-w-lg w-full bg-background/60 backdrop-blur-2xl border-2 border-destructive/10 rounded-[0.1rem] p-12 shadow-2xl shadow-destructive/5 text-center space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                <div className="w-24 h-24 bg-destructive/10 rounded-[0.1rem] flex items-center justify-center mx-auto animate-bounce duration-[3000ms]">
                    <AlertCircle className="text-destructive" size={44} />
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-black tracking-tighter text-foreground">시스템 오류가 발생했습니다</h1>
                    <p className="text-muted-foreground font-medium leading-relaxed">
                        일시적인 오류이거나 처리 중 예상치 못한 문제가 발생했습니다.<br />
                        페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.
                    </p>
                    {error.digest && (
                        <code className="block text-[10px] font-mono text-muted-foreground/50 bg-muted/30 py-1 px-2 rounded-md w-fit mx-auto mt-2">
                            Error ID: {error.digest}
                        </code>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <Button
                        onClick={() => reset()}
                        size="lg"
                        className="rounded-[0.1rem] h-16 font-black bg-destructive hover:bg-destructive/90 text-white shadow-xl shadow-destructive/20 gap-2"
                    >
                        <RotateCcw size={20} /> 다시 시도하기
                    </Button>
                    <Link
                        href="/"
                        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-[0.1rem] h-16 font-bold border-2 border-primary/10 gap-2")}
                    >
                        <Home size={20} /> 홈으로 돌아가기
                    </Link>
                </div>

                <div className="pt-8 border-t border-destructive/5 flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground font-bold">문제가 지속된다면 기술 지원팀에 문의하세요</p>
                    <Link
                        href="/help"
                        className={cn(buttonVariants({ variant: "link", size: "sm" }), "text-primary font-black gap-1")}
                    >
                        <MessageSquare size={14} /> 기술 지원 문의하기
                    </Link>
                </div>
            </div>
        </div>
    );
}
