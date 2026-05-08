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
import { toast } from 'sonner';

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

    // 이미 로그인된 상태라면 워크스페이스로 자동 이동
    React.useEffect(() => {
        if (!loading && user) {
            router.replace('/admin/work-hub');
        }
    }, [user, loading, router]);

    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/admin/work-hub';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !password) {
            setError(t('login.errorEmpty'));
            return;
        }

        setError('');
        setIsSubmitting(true);
        setAuthStep(1);

        try {
            await login({ id, password });
            
            // 프리미엄 체감을 위한 단계별 시각적 피드백
            
            await new Promise(resolve => setTimeout(resolve, 800));
            toast.success("인증 성공: 보안 세션이 성공적으로 수립되었습니다.");
            
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 500);
        } catch (err: any) {
            console.error(err);
            setError(err.message || t('login.errorFailed'));
            setIsSubmitting(false);
            setAuthStep(0);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')] bg-repeat">
            {/* Background Overlay from previous design style */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />

            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                    duration: 0.8, 
                    ease: [0.16, 1, 0.3, 1] 
                }}
                className="w-full max-w-md relative z-10 px-4"
            >
                <Card className="relative overflow-hidden border-0 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[var(--radius-hub-section)]">
                    
                    {/* Advanced Loading Overlay (Functionality Ported) */}
                    <AnimatePresence>
                        {isSubmitting && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
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
                                    <h3 className="text-xl font-bold text-white">
                                        {authStep === 1 ? "로그인 인증 중" : "인증 완료"}
                                    </h3>
                                    <p className="text-slate-400 text-sm">
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
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            엔터프라이즈
                        </CardTitle>
                        <CardDescription className="text-slate-600 font-bold text-xs uppercase tracking-wider">
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
                                <Label htmlFor="id" className="text-xs font-bold text-slate-400 tracking-widest uppercase font-mono ml-1">_ Identity_Protocol</Label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="id"
                                        name="id"
                                        placeholder="Enter Node ID..."
                                        value={id}
                                        onChange={(e) => setId(e.target.value)}
                                        className="h-11 pl-12 rounded-[var(--radius-hub-item)] border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-inner font-mono text-sm"
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
                                <Label htmlFor="password" className="text-xs font-bold text-slate-400 tracking-widest uppercase font-mono ml-1">_ Access_Sequence</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="쨌쨌쨌쨌쨌쨌쨌쨌쨌쨌쨌쨌"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-11 pl-12 pr-12 rounded-[var(--radius-hub-item)] border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-inner font-mono"
                                        autoComplete="current-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-300 hover:text-slate-900 rounded-lg"
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
                                    <Checkbox id="remember" className="rounded-md border-slate-300" />
                                    <Label htmlFor="remember" className="text-xs font-bold text-slate-500 tracking-widest uppercase font-mono cursor-pointer select-none">
                                        Keep_Session
                                    </Label>
                                </div>
                                <Button variant="link" className="text-xs font-bold text-primary tracking-widest uppercase font-mono p-0 h-auto">_ Forgot_Key?</Button>
                            </motion.div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    data-testid="login-error"
                                    className="text-xs font-bold text-rose-500 text-center bg-rose-50 p-4 rounded-[var(--radius-hub-item)] border border-rose-100 animate-shake uppercase font-mono"
                                >
                                    Error: {error}
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
                                    className="w-full h-11 rounded-[var(--radius-hub-item)] bg-slate-900 hover:bg-primary text-white font-bold text-xs tracking-[0.2em] uppercase shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 group" 
                                    type="submit" 
                                    disabled={isSubmitting}
                                >
                                    <LogIn className="h-4 w-4 group-hover:translate-x-1 transition-transform" /> 
                                    Initialize_System_Link
                                </Button>
                            </motion.div>
                        </CardFooter>
                    </form>
                </Card>
                <p className="mt-8 text-center text-xs font-bold text-slate-700 tracking-tight">
                    &copy; 2026 관리 통합 시스템. 보안 노드 01.
                </p>
            </motion.div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">로딩 중...</div>}>
            <LoginContent />
        </Suspense>
    );
}

