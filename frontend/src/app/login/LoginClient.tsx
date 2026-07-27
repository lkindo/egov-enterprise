'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Lock, Eye, EyeOff, LogIn, Loader2, ShieldCheck, Zap } from "lucide-react";
import { useMessage } from '@/hooks/useMessage';
import { motion, AnimatePresence } from 'framer-motion';

import { extractErrorMessage } from '@/app/actions/actionUtils';
function LoginContent() {
    const { t } = useMessage();
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [authStep, setAuthStep] = useState(0); // 0: Idle, 1: Connecting, 2: Finalizing
    const { login, user, loading } = useAuth();
    const router = useRouter();

    const searchParams = useSearchParams();
    // 오픈 리다이렉트 방지: 동일 출처 상대경로("/..."로 시작, 단 "//"·"/\\" 프로토콜상대/백슬래시 우회 차단)만 허용.
    // 절대 URL(https://evil.com)·프로토콜상대 URL(//evil.com)은 기본 경로로 폴백한다.
    const rawRedirect = searchParams.get('redirect') || '/admin/work-hub';
    const redirectUrl = /^\/(?![/\\])/.test(rawRedirect) ? rawRedirect : '/admin/work-hub';

    // 이번 제출로 인증된 것인지(=세션 경계), 이미 인증된 상태로 이 페이지를 방문한 것인지 구분한다.
    // 두 경우는 필요한 이동 방식이 다르다(아래 각 주석 참조). ref 이므로 렌더를 유발하지 않는다.
    const justLoggedIn = React.useRef(false);

    // [소프트 전환] 이미 인증된 상태로 로그인 페이지에 온 경우의 자동 이동.
    // 이때는 루트 레이아웃이 이미 토큰을 가진 채 렌더되어 메뉴도 적재된 상태이므로 소프트 전환으로 충분하다.
    // ⚠ 리다이렉트 발사 지점은 이 곳과 handleSubmit 성공부 단 두 곳이며, justLoggedIn 으로 상호 배타적이다.
    //   과거에는 두 지점이 동시에(useEffect 즉시 + handleSubmit 1300ms 뒤 replace+refresh) 발사되어,
    //   첫 전환이 안착하기 전에 refresh() 가 그 페이로드를 무효화해 "로그인 인증 중" 오버레이에 영구
    //   고착됐다(전환 3초 지연 시 40초+ 고착 / 200ms 지연 시 정상 — 대조 재현으로 확정).
    React.useEffect(() => {
        if (!loading && user && !justLoggedIn.current) {
            router.replace(redirectUrl);
        }
    }, [user, loading, router, redirectUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !password) {
            setError(t('login.errorEmpty'));
            return;
        }

        setError('');
        setIsSubmitting(true);
        setAuthStep(1);
        // login() 이 user 를 세팅하는 순간 위 useEffect 가 소프트 전환을 발사하는 것을 막는다(경합 차단).
        justLoggedIn.current = true;

        try {
            await login({ id, password });

            // 인증 성공 → "인증 완료 / 업무 환경 동기화" 단계 표시.
            // (기존에는 setAuthStep(2) 호출이 저장소 어디에도 없어 이 분기가 도달 불가능한 死코드였다.)
            setAuthStep(2);

            // [하드 전환] 세션 경계에서는 반드시 전체 문서를 다시 받는다. router.replace 로는 안 된다.
            // 루트 레이아웃(app/layout.tsx)이 서버에서 cookies() 로 accessToken 을 읽어 GNB·사이드바 메뉴를
            // prefetch 하는데, 클라이언트 소프트 전환은 레이아웃을 재실행하지 않는다. 그 결과 로그인 직전
            // (비인증) 시점에 만들어진 "빈 메뉴"가 그대로 남아 상단/사이드 메뉴가 통째로 사라진다.
            // (실측: 소프트 전환 직후 header+aside 링크 3개 → F5 후 22개.)
            // 과거 이 갱신은 router.refresh() 가 대신했으나, 두 번째 replace 와 동시 발사되어 진행 중이던
            // 전환을 무효화시키는 무한 "인증중" 고착의 원인이었다. 하드 전환은 그 부작용 없이 목적을 이룬다.
            window.location.replace(redirectUrl);
        } catch (err) {
            justLoggedIn.current = false;
            console.error(err);
            setError(extractErrorMessage(err, t('login.errorFailed')));
            setIsSubmitting(false);
            setAuthStep(0);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')] bg-repeat">
            {/* Background Overlay from previous design style */}
            <h1 className="sr-only">전자정부 Enterprise 로그인</h1>
            <div className="absolute inset-0 bg-surface-inverse/40 backdrop-blur-[2px]" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1]
                }}
                className="w-full max-w-md relative z-10 px-4"
            >
                <Card className="relative overflow-hidden border-0 shadow-2xl bg-card/95 backdrop-blur-xl rounded-[var(--radius-hub-section)]">

                    {/* Advanced Loading Overlay (Functionality Ported) */}
                    <AnimatePresence>
                        {isSubmitting && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 bg-surface-inverse/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    className="w-20 h-11 bg-white rounded-lg shadow-2xl flex items-center justify-center mb-6"
                                >
                                    {authStep === 1 ? (
                                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                    ) : (
                                        <ShieldCheck className="w-10 h-10 text-emerald-500" />
                                    )}
                                </motion.div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-surface-inverse-foreground">
                                        {authStep === 1 ? "로그인 인증 중" : "인증 완료"}
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        {authStep === 1 ? "보안 노드에 접속 시도 중..." : "사용자 업무 환경 동기화 중..."}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <CardHeader className="space-y-2 text-center pt-10">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="w-12 h-12 bg-primary/10 rounded-[var(--radius-hub-item)] mx-auto flex items-center justify-center mb-2"
                        >
                            <Zap className="text-primary w-6 h-6 fill-primary" />
                        </motion.div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                            엔터프라이즈
                        </CardTitle>
                        <CardDescription className="text-muted-foreground font-bold text-xs tracking-tight">
                            글로벌 통합 관리 콘솔
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-5 px-8">
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="space-y-2"
                            >
                                <Label htmlFor="id" className="text-xs font-bold text-muted-foreground tracking-tight ml-1">아이디</Label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="id"
                                        name="id"
                                        placeholder="아이디를 입력하세요..."
                                        value={id}
                                        onChange={(e) => setId(e.target.value)}
                                        className="h-11 pl-12 rounded-[var(--radius-hub-item)] border-border bg-muted/50 focus:bg-white transition-all shadow-inner font-mono text-sm"
                                        autoComplete="username"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="space-y-2"
                            >
                                <Label htmlFor="password" className="text-xs font-bold text-muted-foreground tracking-tight ml-1">비밀번호</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="비밀번호를 입력하세요"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-11 pl-12 pr-12 rounded-[var(--radius-hub-item)] border-border bg-muted/50 focus:bg-white transition-all shadow-inner font-mono"
                                        autoComplete="current-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-300 hover:text-foreground rounded-lg"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="flex items-center justify-between px-1"
                            >
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="remember" className="rounded-md border-border" />
                                    <Label htmlFor="remember" className="text-xs font-bold text-muted-foreground tracking-normal uppercase font-mono cursor-pointer select-none">
                                        로그인 상태 유지
                                    </Label>
                                </div>
                                <Button variant="link" className="text-xs font-bold text-primary tracking-tight p-0 h-auto">비밀번호를 잊으셨나요?</Button>
                            </motion.div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    data-testid="login-error"
                                    className="text-xs font-bold text-rose-500 text-center bg-rose-50 p-4 rounded-[var(--radius-hub-item)] border border-rose-100 animate-shake uppercase font-mono"
                                >
                                    오류: {error}
                                </motion.div>
                            )}
                        </CardContent>

                        <CardFooter className="px-8 pb-10 pt-2">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                className="w-full"
                            >
                                <Button
                                    className="w-full h-11 rounded-[var(--radius-hub-item)] bg-surface-inverse hover:bg-primary text-surface-inverse-foreground font-bold text-xs tracking-tight shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    <LogIn className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    로그인
                                </Button>
                            </motion.div>
                        </CardFooter>
                    </form>
                </Card>
                <p className="mt-8 text-center text-xs font-bold text-foreground tracking-tight">
                    &copy; 2026 관리 통합 시스템. 보안 노드 01.
                </p>
            </motion.div>
        </div>
    );
}

export default function LoginClient() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-muted">로딩 중...</div>}>
            <LoginContent />
        </Suspense>
    );
}
