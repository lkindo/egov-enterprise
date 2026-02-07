'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, Send, ArrowLeft, Home, ChevronRight, MessageSquare, Info, Type, FileText } from "lucide-react";

const InsertBBSContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bbsId = searchParams.get('bbsId') || 'BBSMSTR_AAAAAAAAAAAA';

    const [formData, setFormData] = useState({
        nttSj: '',
        nttCn: '',
        bbsId
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nttSj.trim()) { alert('제목을 입력해주세요.'); return; }
        if (!formData.nttCn.trim()) { alert('내용을 입력해주세요.'); return; }

        setLoading(true);
        try {
            const response = await axios.post('/bbs', formData);
            if (response.data.success) {
                alert(response.data.message);
                router.push(`/cop/bbs/selectBoardList?bbsId=${bbsId}`);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || '등록에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-2xl w-fit border border-slate-100">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> Home
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link href={`/cop/bbs/selectBoardList?bbsId=${bbsId}`} className="hover:text-foreground transition-colors font-bold">커뮤니티</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-black">글쓰기</span>
            </div>

            <Card className="shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border-none overflow-hidden rounded-[3rem] bg-white">
                <CardHeader className="border-b bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 pb-16 pt-16 px-12 text-white">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 px-5 py-2 bg-white/10 w-fit rounded-full border border-white/10 backdrop-blur-md">
                                <Edit3 className="w-4 h-4 text-primary-foreground animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/80">Premium Editor</span>
                            </div>
                            <CardTitle className="text-5xl font-black tracking-tighter leading-none italic uppercase">
                                Create New Post
                            </CardTitle>
                            <p className="text-slate-400 font-medium text-lg max-w-lg leading-relaxed">
                                당신의 생각과 정보를 동료들과 나누세요. <br />창의적이고 자유로운 소통을 환영합니다.
                            </p>
                        </div>
                        <div className="hidden md:block">
                            <div className="w-24 h-24 rounded-[2rem] bg-white/5 border-2 border-white/10 flex items-center justify-center rotate-12 group hover:rotate-0 transition-transform duration-500">
                                <MessageSquare className="w-10 h-10 text-white/20 group-hover:text-primary-foreground transition-colors" />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="pt-20 px-12 md:px-20 space-y-16">
                        {/* Title Input */}
                        <div className="space-y-6 group">
                            <Label htmlFor="nttSj" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-focus-within:text-primary transition-colors flex items-center gap-3">
                                <Type className="w-4 h-4" /> Post Title
                            </Label>
                            <Input
                                id="nttSj"
                                placeholder="생각을 요약할 매력적인 제목을 입력하세요"
                                className="h-20 text-3xl font-black border-2 border-slate-50 focus:border-slate-900 focus-visible:ring-slate-100 transition-all rounded-[1.5rem] px-8 bg-slate-50/50 shadow-inner group-focus-within:shadow-xl group-focus-within:bg-white placeholder:text-slate-300"
                                value={formData.nttSj}
                                onChange={(e) => setFormData({ ...formData, nttSj: e.target.value })}
                                required
                            />
                        </div>

                        {/* Content Area */}
                        <div className="space-y-6 group">
                            <Label htmlFor="nttCn" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-focus-within:text-primary transition-colors flex items-center gap-3">
                                <FileText className="w-4 h-4" /> Content Body
                            </Label>
                            <div className="relative">
                                <Textarea
                                    id="nttCn"
                                    placeholder="자유롭게 내용을 작성하세요. 친절하고 배려 깊은 댓글 문화를 위해 상호 존중하며 대화해 주세요."
                                    className="min-h-[450px] p-10 text-xl font-medium leading-loose border-2 border-slate-50 focus:border-slate-900 focus-visible:ring-slate-100 transition-all rounded-[2.5rem] bg-slate-50/50 shadow-inner group-focus-within:shadow-2xl group-focus-within:bg-white resize-none scrollbar-thin scrollbar-thumb-slate-200"
                                    value={formData.nttCn}
                                    onChange={(e) => setFormData({ ...formData, nttCn: e.target.value })}
                                    required
                                />
                                {/* Bottom Indicator */}
                                <div className="absolute bottom-6 right-10 flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest pointer-events-none">
                                    <span className="w-2 h-2 rounded-full bg-slate-200" /> Auto-Saving Enabled
                                </div>
                            </div>
                        </div>

                        {/* Recommendation Card */}
                        <div className="p-8 bg-slate-900 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute right-[-40px] top-[-40px] bg-primary/20 w-48 h-48 rounded-full blur-[80px] group-hover:bg-primary/30 transition-all duration-1000" />
                            <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-xl group-hover:scale-110 transition-transform">
                                <Info className="w-8 h-8 text-primary-foreground" />
                            </div>
                            <div className="space-y-2 text-center md:text-left relative z-10">
                                <p className="font-black text-2xl text-white tracking-tight italic uppercase">Writing Guidelines</p>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[500px]">
                                    타인에 대한 비방이나 부적절한 언어 사용은 관리자에 의해 제한될 수 있습니다.
                                    모두가 즐겁게 소통할 수 있는 프리미엄 커뮤니티 문화를 함께 만들어 주세요.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col md:flex-row justify-center gap-6 py-16 border-t border-slate-50 bg-slate-50/30 px-12 rounded-b-[3rem]">
                        <Link href={`/cop/bbs/selectBoardList?bbsId=${bbsId}`}>
                            <Button type="button" variant="ghost" className="h-20 px-16 font-black uppercase tracking-[0.3em] text-xs text-slate-400 hover:bg-white hover:text-rose-500 hover:shadow-2xl transition-all rounded-[1.5rem] active:scale-95 border-2 border-transparent hover:border-rose-50">
                                <ArrowLeft className="w-5 h-5 mr-4" /> Cancel & Go back
                            </Button>
                        </Link>
                        <Button type="submit" className="h-20 px-24 gap-4 font-black uppercase tracking-[0.3em] text-xs shadow-[0_20px_40px_-5px_theme(colors.slate.900/30)] bg-slate-900 hover:bg-black transition-all active:scale-95 ring-[16px] ring-slate-100 rounded-[1.5rem]" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-3 animate-pulse">
                                    <div className="w-3 h-3 bg-white rounded-full" /> Publishing Article...
                                </span>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" /> Publish New Post
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

const InsertBoardArticlePage = () => {
    return (
        <Suspense fallback={<div className="p-10 text-center font-bold">로딩 중...</div>}>
            <InsertBBSContent />
        </Suspense>
    );
};

export default InsertBoardArticlePage;
