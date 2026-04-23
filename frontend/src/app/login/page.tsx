'use client';

import React, { useState } from 'react';
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

export default function LoginPage() {
    const { t } = useMessage();
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [authStep, setAuthStep] = useState(0); // 0: Idle, 1: Connecting, 2: Finalizing
    const { login, user, loading } = useAuth();
    const router = useRouter();

    // ?대? 濡쒓렇?몃맂 ?곹깭?쇰㈃ ??쒕낫?쒕줈 ?먮룞 ?대룞
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
            
            // ?꾨━誘몄뾼 泥닿컧???꾪븳 ?④퀎蹂??쒓컖???쇰뱶諛?            setTimeout(() => setAuthStep(2), 400);
            
            await new Promise(resolve => setTimeout(resolve, 800));
            toast.success("?몄쬆 ?깃났: 蹂댁븞 ?몄뀡???깃났?곸쑝濡??섎┰?섏뿀?듬땲??");
            
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
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat">
            {/* Background Overlay from previous design style */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md relative z-10 px-4"
            >
                <Card className="relative overflow-hidden border-0 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl">
                    
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
                                    className="w-20 h-20 bg-white rounded-2xl shadow-2xl flex items-center justify-center mb-6"
                                >
                                    {authStep === 1 ? (
                                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                    ) : (
                                        <ShieldCheck className="w-10 h-10 text-emerald-500" />
                                    )}
                                </motion.div>
                                
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white">
                                        {authStep === 1 ? "濡쒓렇???몄쬆 以? : "?몄쬆 ?꾨즺"}
                                    </h3>
                                    <p className="text-slate-400 text-sm">
                                        {authStep === 1 ? "蹂댁븞 ?몃뱶???묒냽 ?쒕룄 以?.." : "?ъ슜???낅Т ?섍꼍 ?숆린??以?.."}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <CardHeader className="space-y-2 text-center pt-10">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl mx-auto flex items-center justify-center mb-2">
                            <Zap className="text-primary w-6 h-6 fill-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            ?뷀꽣?꾨씪?댁쫰
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-medium text-xs uppercase tracking-wider">
                            湲濡쒕쾶 ?듯빀 愿由?肄섏넄
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-5 px-8">
                            <div className="space-y-2">
                                <Label htmlFor="id" className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">?ъ슜???꾩씠??/Label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="id"
                                        placeholder="?쒖뒪???꾩씠?붾? ?낅젰?섏꽭??
                                        value={id}
                                        onChange={(e) => setId(e.target.value)}
                                        className="h-12 pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition shadow-sm"
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">?≪꽭????/Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="쨌쨌쨌쨌쨌쨌쨌쨌쨌쨌쨌쨌"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-12 pl-10 pr-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition shadow-sm"
                                        autoComplete="current-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-400 hover:text-slate-900 rounded-lg"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="remember" className="rounded-md border-slate-300" />
                                    <Label htmlFor="remember" className="text-xs font-medium text-slate-500 cursor-pointer select-none">
                                        濡쒓렇???곹깭 ?좎?
                                    </Label>
                                </div>
                                <Button variant="link" className="text-xs font-semibold text-primary p-0 h-auto">鍮꾨?踰덊샇 李얘린</Button>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    data-testid="login-error"
                                    className="text-xs font-bold text-rose-500 text-center bg-rose-50 p-3 rounded-xl border border-rose-100"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </CardContent>

                        <CardFooter className="px-8 pb-10 pt-2">
                            <Button 
                                className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-lg transition active:scale-[0.98] flex items-center gap-2" 
                                type="submit" 
                                disabled={isSubmitting}
                            >
                                <LogIn className="h-4 w-4" /> 
                                ?쒖뒪???묒냽?섍린
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
                <p className="mt-8 text-center text-[11px] font-medium text-slate-500 tracking-tight opacity-60">
                    &copy; 2026 愿由??듯빀 ?쒖뒪?? 蹂댁븞 ?몃뱶 01.
                </p>
            </motion.div>
        </div>
    );
}
