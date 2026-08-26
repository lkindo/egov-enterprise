'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { User, Lock, Eye, EyeOff, LogIn, Loader2, ShieldCheck, Zap } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

import { LOGIN_FAILURE_MESSAGE } from '@/lib/auth/login-error';
import { SITE_IDENTITY } from '@/config/site-identity';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { loginFormSchema } from './login-form-validation';

const LOGIN_FORM_LABELS = {
    userId: '아이디',
    password: '비밀번호',
};
const DEFAULT_POST_LOGIN_PATH = '/admin/work-hub';
const REDIRECT_VALIDATION_ORIGIN = 'https://internal.invalid';

export function resolveInternalRedirect(rawRedirect: string | null): string {
    if (
        !rawRedirect
        || !rawRedirect.startsWith('/')
        || /[\\\u0000-\u001f\u007f]/.test(rawRedirect)
        || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(rawRedirect)
    ) {
        return DEFAULT_POST_LOGIN_PATH;
    }

    try {
        const parsed = new URL(rawRedirect, REDIRECT_VALIDATION_ORIGIN);
        if (
            parsed.origin !== REDIRECT_VALIDATION_ORIGIN
            || parsed.protocol !== 'https:'
            || parsed.username
            || parsed.password
        ) {
            return DEFAULT_POST_LOGIN_PATH;
        }

        const canonicalPath = parsed.pathname;
        if (parsed.pathname.startsWith('//')) return DEFAULT_POST_LOGIN_PATH;

        // Dot-segment normalization can turn an apparently local path into a protocol-relative
        // string (for example "/a/..//host"). Validate the exact value handed to navigation again.
        const navigationTarget = new URL(canonicalPath, REDIRECT_VALIDATION_ORIGIN);
        if (navigationTarget.origin !== REDIRECT_VALIDATION_ORIGIN) return DEFAULT_POST_LOGIN_PATH;

        return canonicalPath;
    } catch {
        return DEFAULT_POST_LOGIN_PATH;
    }
}

function LoginContent() {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [authStep, setAuthStep] = useState(0); // 0: Idle, 1: Connecting, 2: Finalizing
    const submittingRef = React.useRef(false);
    const { login, user, loading } = useAuth();
    const router = useRouter();
    const shouldReduceMotion = useReducedMotion();
    const loginRootRef = React.useRef<HTMLDivElement>(null);
    const progressRef = React.useRef<HTMLDivElement>(null);
    const returnFocusRef = React.useRef<HTMLElement | null>(null);

    const searchParams = useSearchParams();
    // URL parser가 제거하는 제어문자까지 먼저 거부한 뒤, 고정된 검증 origin으로 파싱해
    // 동일 출처의 canonical pathname만 이동 지점에 전달한다. 로그인 intent에 원래 query/fragment를
    // 재전파하지 않아 record locator나 자유 입력값이 인증 경계를 넘어 URL에 남는 것을 막는다.
    const redirectUrl = resolveInternalRedirect(searchParams.get('redirect'));

    // 이번 제출로 인증된 것인지(=세션 경계), 이미 인증된 상태로 이 페이지를 방문한 것인지 구분한다.
    // 두 경우는 필요한 이동 방식이 다르다(아래 각 주석 참조). ref 이므로 렌더를 유발하지 않는다.
    const justLoggedIn = React.useRef(false);

    // [W1-24] 로그인 실패 시 포커스를 되돌릴 대상. 실패해도 포커스가 '로그인' 버튼에 머물러 있어서
    //   키보드·스크린리더 사용자는 오류 위치도 재입력 위치도 알 수 없었다.
    const idInputRef = React.useRef<HTMLInputElement>(null);
    const restoreIdFocusAfterFailureRef = React.useRef(false);
    const validation = useManualFormValidation(loginFormSchema, {
        labels: LOGIN_FORM_LABELS,
        focusTargets: { userId: () => idInputRef.current },
    });

    // 로그인은 전역 AppShell 안에서 렌더되지만 시각적으로는 독립된 modal surface다. 배경의
    // skip link/header/sidebar/footer가 보이면서도 키보드·접근성 트리에는 남아 있으면 사용자가 로그인
    // 폼을 벗어나 비활성 shell을 탐색하게 된다. mount 동안만 외부 landmark를 격리하고 기존
    // 속성을 정확히 복원한다. (로그인 콘텐츠 내부 landmark가 생겨도 격리하지 않는다.)
    React.useEffect(() => {
        const loginRoot = loginRootRef.current;
        if (!loginRoot) return;

        returnFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const shellLandmarks = [...new Set(document.querySelectorAll<HTMLElement>(
            '[data-sidebar-modal-background], header, aside, footer',
        ))].filter((element) => (
            !loginRoot.contains(element) && !element.contains(loginRoot)
        ));
        const snapshots = shellLandmarks.map((element) => ({
            element,
            ariaHidden: element.getAttribute('aria-hidden'),
            hadInertAttribute: element.hasAttribute('inert'),
            inertAttributeValue: element.getAttribute('inert'),
        }));

        for (const { element } of snapshots) {
            element.setAttribute('aria-hidden', 'true');
            element.setAttribute('inert', '');
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;
            const focusable = [...loginRoot.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            )].filter((element) => !element.closest('[inert]') && element.getAttribute('aria-hidden') !== 'true');

            if (focusable.length === 0) {
                event.preventDefault();
                (progressRef.current ?? loginRoot).focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || !loginRoot.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !loginRoot.contains(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        idInputRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            for (const { element, ariaHidden, hadInertAttribute, inertAttributeValue } of snapshots) {
                if (ariaHidden === null) element.removeAttribute('aria-hidden');
                else element.setAttribute('aria-hidden', ariaHidden);
                if (hadInertAttribute) element.setAttribute('inert', inertAttributeValue ?? '');
                else element.removeAttribute('inert');
            }
            const returnTarget = returnFocusRef.current;
            if (returnTarget?.isConnected) returnTarget.focus();
            returnFocusRef.current = null;
        };
    }, []);

    React.useEffect(() => {
        if (isSubmitting) progressRef.current?.focus();
    }, [isSubmitting, authStep]);

    React.useEffect(() => {
        if (!isSubmitting && error && restoreIdFocusAfterFailureRef.current) {
            restoreIdFocusAfterFailureRef.current = false;
            idInputRef.current?.focus();
        }
    }, [error, isSubmitting]);

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
        if (submittingRef.current) return;
        setError('');
        const validated = validation.validate({ userId: id, password });
        if (!validated) return;

        submittingRef.current = true;
        restoreIdFocusAfterFailureRef.current = false;
        setIsSubmitting(true);
        setAuthStep(1);
        // login() 이 user 를 세팅하는 순간 위 useEffect 가 소프트 전환을 발사하는 것을 막는다(경합 차단).
        justLoggedIn.current = true;

        try {
            await login({ id: validated.userId, password: validated.password });

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
        } catch {
            submittingRef.current = false;
            justLoggedIn.current = false;
            restoreIdFocusAfterFailureRef.current = true;
            setError(LOGIN_FAILURE_MESSAGE);
            setIsSubmitting(false);
            setAuthStep(0);
            // 포커스는 위 effect에서 form의 inert 제거가 DOM에 커밋된 뒤 복원한다.
        }
    };

    return (
        <div
            ref={loginRootRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            tabIndex={-1}
            className="min-h-screen flex items-center justify-center bg-muted bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')] bg-repeat"
        >
            {/* Background Overlay from previous design style */}
            <div className="absolute inset-0 bg-surface-inverse/40 backdrop-blur-[2px]" />

            <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1]
                }}
                className="w-full max-w-md relative z-10 px-4"
            >
                <Card
                    data-login-card
                    aria-busy={isSubmitting}
                    className="relative overflow-hidden border-0 shadow-2xl bg-card/95 backdrop-blur-xl rounded-[var(--radius-hub-section)]"
                >

                    {/* Advanced Loading Overlay (Functionality Ported) */}
                    <AnimatePresence>
                        {isSubmitting && (
                            <motion.div
                                ref={progressRef}
                                role="status"
                                aria-live="polite"
                                aria-atomic="true"
                                tabIndex={-1}
                                initial={shouldReduceMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                                className="absolute inset-0 z-50 bg-surface-inverse/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                            >
                                <motion.div
                                    initial={shouldReduceMotion ? false : { scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    className="w-20 h-11 bg-card rounded-lg shadow-2xl flex items-center justify-center mb-6"
                                >
                                    {authStep === 1 ? (
                                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                    ) : (
                                        <ShieldCheck className="w-10 h-10 text-emerald-500" />
                                    )}
                                </motion.div>

                                <div className="space-y-2">
                                    <p className="text-xl font-bold text-surface-inverse-foreground">
                                        {authStep === 1 ? "로그인 인증 중" : "인증 완료"}
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        {authStep === 1 ? "로그인 정보를 확인하는 중..." : "업무 화면으로 이동하는 중..."}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <CardHeader className="space-y-2 text-center pt-10">
                        <motion.div
                            initial={shouldReduceMotion ? false : { scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="w-12 h-12 bg-primary/10 rounded-[var(--radius-hub-item)] mx-auto flex items-center justify-center mb-2"
                        >
                            <Zap className="text-primary w-6 h-6 fill-primary" />
                        </motion.div>
                        <h1 id="login-title" className="text-2xl font-bold tracking-tight text-foreground">
                            {SITE_IDENTITY.siteShortName}
                        </h1>
                        <CardDescription className="text-muted-foreground font-bold text-xs tracking-tight">
                            글로벌 통합 관리 콘솔
                        </CardDescription>
                    </CardHeader>

                    <form
                        noValidate
                        onSubmit={handleSubmit}
                        inert={isSubmitting ? true : undefined}
                        aria-hidden={isSubmitting ? 'true' : undefined}
                    >
                        <CardContent className="space-y-5 px-8">
                            <FormErrorSummary
                                data-testid="login-validation-summary"
                                errors={validation.errors}
                                labels={LOGIN_FORM_LABELS}
                                onNavigate={validation.focusError}
                            />
                            <motion.div
                                initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="space-y-2"
                            >
                                <Label htmlFor="id" className="text-xs font-bold text-muted-foreground tracking-tight ml-1">
                                    아이디
                                </Label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="id"
                                        maxLength={20}
                                        aria-required="true"
                                        {...validation.fieldProps('userId')}
                                        ref={idInputRef}
                                        placeholder="아이디를 입력하세요..."
                                        value={id}
                                        onChange={(e) => {
                                            setId(e.target.value);
                                            setError('');
                                            validation.clearError('userId');
                                        }}
                                        className="h-11 pl-12 rounded-[var(--radius-hub-item)] border-border bg-muted/50 focus:bg-card transition-all shadow-inner font-mono text-sm"
                                        autoComplete="username"
                                    />
                                </div>
                                {validation.errors.userId ? (
                                    <p {...validation.messageProps('userId')} className="text-xs font-bold text-destructive-emphasis" />
                                ) : null}
                            </motion.div>

                            <motion.div
                                initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="space-y-2"
                            >
                                <Label htmlFor="password" className="text-xs font-bold text-muted-foreground tracking-tight ml-1">
                                    비밀번호
                                </Label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password"
                                        aria-required="true"
                                        {...validation.fieldProps('password')}
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="비밀번호를 입력하세요"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setError('');
                                            validation.clearError('password');
                                        }}
                                        className="h-11 pl-12 pr-12 rounded-[var(--radius-hub-item)] border-border bg-muted/50 focus:bg-card transition-all shadow-inner font-mono"
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
                                {validation.errors.password ? (
                                    <p {...validation.messageProps('password')} className="text-xs font-bold text-destructive-emphasis" />
                                ) : null}
                            </motion.div>

                            {/* [W1-24] 동작하지 않던 컨트롤 2종 제거.
                                · '로그인 상태 유지' 체크박스 — checked/onCheckedChange/name 이 전무해 값을 읽는 곳이
                                  하나도 없었다(전수 grep: 소비처 0, e2e 참조 0). 실제로 동작시키려면 리프레시 토큰
                                  수명 정책을 바꿔야 하는데, 그것은 절대 만료 유지 결정과 충돌한다.
                                · '비밀번호를 잊으셨나요?' — 재설정 라우트도 백엔드 엔드포인트도 저장소에 없다
                                  (전수 검색 히트 1건 = 이 문자열 자신). 게다가 type 이 없어 form 안에서 submit 로
                                  동작했다 — 클릭하면 진짜 로그인 시도가 발사돼 로그인 로그를 오염시키고
                                  계정 잠금 카운터를 소모했다. 동작하지 않는 컨트롤은 사용자에게 거짓말을 한다. */}

                            {error && (
                                <motion.div
                                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    // [W1-24] role="alert" 는 aria-live="assertive" 를 함의한다.
                                    //   이 블록은 error 가 false→true 로 바뀌며 노드가 새로 삽입되는 구조라,
                                    //   라이브 리전이 없으면 보조기술에 어떤 알림도 가지 않는다
                                    //   (시각 사용자만 animate-shake 로 인지했다).
                                    role="alert"
                                    data-testid="login-error"
                                    className="text-xs font-bold text-destructive-emphasis text-center bg-destructive/5 p-4 rounded-[var(--radius-hub-item)] border border-destructive/20 animate-shake uppercase font-mono"
                                >
                                    오류: {error}
                                </motion.div>
                            )}
                        </CardContent>

                        <CardFooter className="px-8 pb-10 pt-2">
                            <motion.div
                                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
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
                    &copy; 2026 관리 통합 시스템.
                </p>
            </motion.div>
        </div>
    );
}

export default function LoginClient() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-muted">
                <h1 className="sr-only">로그인 화면을 불러오는 중</h1>
                <p role="status">로딩 중...</p>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
