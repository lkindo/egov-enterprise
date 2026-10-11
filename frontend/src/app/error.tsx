'use client';

import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ErrorReference } from '@/app/components/ui/error-reference';
import { visibleEntries, type ShellLink } from '@/extensions/slots';
import { shellLinks } from '@/extensions/generated-shell-links';

// 셸 링크 슬롯에서 오류 화면 배치만 고른다.
const isErrorShellLink = (link: ShellLink) => link.placement === 'error';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const handleReset = () => {
        reset();
    };
    // 오류 경계는 인증 공급자에 기대지 않는다(주체 null). 오류 화면 항목은 /admin 밖 목적지만 둔다(경계 계약).
    const errorShellLinks = visibleEntries(null, shellLinks, isErrorShellLink);

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-destructive/5 rounded-lg blur-[120px] -z-10" />

            <div className="max-w-lg w-full bg-background/60 backdrop-blur-2xl border-2 border-destructive/10 rounded-lg p-12 shadow-2xl shadow-destructive/5 text-center space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                <div className="w-24 h-24 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto animate-bounce duration-[3000ms]">
                    <AlertCircle className="text-destructive-emphasis" size={44} />
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-bold tracking-tighter text-foreground">시스템 오류가 발생했습니다</h1>
                    <p className="text-muted-foreground font-medium leading-relaxed">
                        일시적인 오류이거나 처리 중 예상치 못한 문제가 발생했습니다.<br />
                        페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <Button
                        onClick={handleReset}
                        size="lg"
                        className="rounded-lg font-bold bg-destructive hover:bg-destructive/90 text-white shadow-xl shadow-destructive/20 gap-2"
                    >
                        <RotateCcw size={20} /> 다시 시도하기
                    </Button>
                    <Link
                        href="/"
                        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-lg font-bold border-2 border-primary/10 gap-2")}
                    >
                        <Home size={20} /> 홈으로 돌아가기
                    </Link>
                </div>

                {errorShellLinks.map(({ id, href, label, icon: Icon, description }) => (
                    <div key={id} className="pt-8 border-t border-destructive/5 flex flex-col items-center gap-2">
                        {description ? <p className="text-sm text-muted-foreground font-bold">{description}</p> : null}
                        <Link
                            href={href}
                            className={cn(buttonVariants({ variant: "link", size: "sm" }), "text-primary font-bold gap-1")}
                        >
                            {/* 아이콘 뒤 공백과 이름을 한 텍스트 노드로 둔다 — 종전 정적 링크와 같은 DOM 이다. */}
                            {Icon ? <><Icon size={14} />{` ${label}`}</> : label}
                        </Link>
                    </div>
                ))}
                <ErrorReference digest={error.digest} />
            </div>
        </div>
    );
}
