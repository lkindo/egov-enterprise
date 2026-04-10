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
    const { login } = useAuth();
    const router = useRouter();

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
            setTimeout(() => setAuthStep(2), 400);
            
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
        <div className="min-h-screen flex items-center justify-center bg-slate-950 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat">
            {/* Dynamic Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-md relative z-10 px-4"
            >
                <Card className="relative overflow-hidden border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl rounded-[2.5rem] ring-1 ring-white/20">
                    
                    {/* Advanced Loading Overlay */}
                    <AnimatePresence>
                        {isSubmitting && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0.8, rotate: -10 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center mb-8"
                                >
                                    {authStep === 1 ? (
                                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                    ) : (
                                        <ShieldCheck className="w-12 h-12 text-emerald-500" />
                                    )}
                                </motion.div>
                                
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-3"
                                >
                                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                                        {authStep === 1 ? "Authentication" : "Authorized"}
                                    </h3>
                                    <p className="text-slate-300 font-bold text-xs tracking-widest uppercase opacity-70">
                                        {authStep === 1 ? "Connecting to Security Node..." : "Syncing User Environment..."}
                                    </p>
                                </motion.div>

                                <div className="absolute bottom-12 w-full px-12">
                                     <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                         <motion.div 
                                            initial={{ width: "0%" }}
                                            animate={{ width: authStep === 1 ? "60%" : "100%" }}
                                            className="h-full bg-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]"
                                         />
                                     </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <CardHeader className="space-y-4 text-center p-12 pb-6">
                        <motion.div 
                            whileHover={{ scale: 1.05 }}
                            className="w-16 h-16 bg-slate-950 rounded-2xl mx-auto flex items-center justify-center shadow-xl mb-4"
                        >
                            <Zap className="text-primary w-8 h-8 fill-primary" />
                        </motion.div>
                        <div className="space-y-1">
                            <CardTitle className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                                Enterprise
                            </CardTitle>
                            <CardDescription className="text-slate-500 font-bold text-[10px] tracking-[0.3em] uppercase opacity-60">
                                Global Management Console
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-6 px-12">
                            <div className="space-y-3">
                                <Label htmlFor="id" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Terminal ID</Label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="id"
                                        placeholder="Enter your identification"
                                        value={id}
                                        onChange={(e) => setId(e.target.value)}
                                        className="h-14 pl-12 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="password border-none" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Access Key</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="············"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-14 pl-12 pr-12 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
                                        autoComplete="current-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-400 hover:text-slate-900 rounded-xl"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center space-x-3">
                                    <Checkbox id="remember" className="rounded-lg border-slate-300" />
                                    <Label htmlFor="remember" className="text-[11px] font-bold text-slate-500 cursor-pointer select-none">
                                        Persistent Connection
                                    </Label>
                                </div>
                                <Button variant="link" className="text-[11px] font-bold text-primary p-0 h-auto">Forgot Key?</Button>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[11px] font-black text-rose-500 text-center bg-rose-50 p-4 rounded-2xl border border-rose-100 uppercase tracking-tight"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </CardContent>

                        <CardFooter className="p-12 pt-6">
                            <Button 
                                className="w-full h-16 rounded-2.5xl bg-slate-900 hover:bg-black text-white font-black text-xs tracking-[0.3em] uppercase shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3" 
                                type="submit" 
                                disabled={isSubmitting}
                            >
                                <LogIn className="h-5 w-5" /> 
                                Establish Connection
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
                <p className="mt-8 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-40">
                    &copy; 2026 Admin Orchestration System. Secure Node 01.
                </p>
            </motion.div>
        </div>
    );
}
