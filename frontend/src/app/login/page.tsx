'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { useMessage } from '@/hooks/useMessage';

export default function LoginPage() {
    const { t } = useMessage();
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !password) {
            setError(t('login.errorEmpty'));
            return;
        }

        setError('');
        setIsSubmitting(true);
        try {
            await login({ id, password });
            // AuthContext 의 user 상태 업데이트가 완료될 때까지 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 100));
            // router.push 사용 (페이지 완전 리로드 방지)
            router.push(redirectUrl);
        } catch (err: any) {
            console.error(err);
            setError(err.message || t('login.errorFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 bg-[url('/images/login-bg.png')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-primary">전자정부 엔터프라이즈</CardTitle>
                    <CardDescription>
                        {t('login.title')}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="id">{t('login.idLabel')}</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="id"
                                    placeholder={t('login.idPlaceholder')}
                                    value={id}
                                    onChange={(e) => setId(e.target.value)}
                                    className="pl-9"
                                    autoComplete="username"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('login.pwLabel')}</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={t('login.pwPlaceholder')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9 pr-9"
                                    autoComplete="current-password"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-0 h-full w-9 text-muted-foreground hover:text-foreground"
                                    aria-label={showPassword ? t('login.hidePassword') : t('login.viewPassword')}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox id="remember" />
                            <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                                {t('login.rememberId')}
                            </Label>
                        </div>

                        {error && (
                            <div
                                data-testid="login-error"
                                className="text-sm text-red-500 font-medium text-center bg-red-50 p-2 rounded"
                            >
                                {error}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full h-11 text-base" type="submit" isLoading={isSubmitting}>
                            {isSubmitting ? t('login.submitting') : (
                                <>
                                    <LogIn className="mr-2 h-4 w-4" /> {t('login.submit')}
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
