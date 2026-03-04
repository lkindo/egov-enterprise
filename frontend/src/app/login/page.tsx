'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !password) {
            setError('아이디와 비밀번호를 입력해주세요.');
            return;
        }

        setError('');
        setIsSubmitting(true);
        try {
            await login({ id, password });
            router.push('/');
        } catch (err: any) {
            console.error(err);
            setError(err.message || '로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 bg-[url('/images/login-bg.png')] bg-cover bg-center">
            {/* Overlay for better readability if background image is used */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-primary">E-GOV ENTERPRISE</CardTitle>
                    <CardDescription>
                        표준프레임워크 엔터프라이즈 시스템
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="id">아이디</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="id"
                                    placeholder="아이디를 입력하세요"
                                    value={id}
                                    onChange={(e) => setId(e.target.value)}
                                    className="pl-9"
                                    autoComplete="username"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="비밀번호를 입력하세요"
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
                                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
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
                                아이디 저장
                            </Label>
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full h-11 text-base" type="submit" isLoading={isSubmitting}>
                            {isSubmitting ? "로그인 중..." : (
                                <>
                                    <LogIn className="mr-2 h-4 w-4" /> 로그인
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
