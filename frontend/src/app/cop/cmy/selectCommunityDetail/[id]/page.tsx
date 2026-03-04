'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Users, Info, Calendar, ArrowLeft, Home, ChevronRight, ShieldCheck, Mail, Globe, MapPin, Layout } from "lucide-react";

interface CommunityDetail {
    cmmntyId: string;
    cmmntyNm: string;
    cmmntyIntrcn: string;
    frstRegisterNm: string;
    frstRegisterPnttm: string;
    tmplatId: string;
}

const CommunityDetailPage = () => {
    const params = useParams();
    const router = useRouter();
    const cmmntyId = params.id as string;

    const [detail, setDetail] = useState<CommunityDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const response = (await axios.get(`/community/${cmmntyId}`)) as any;
            setDetail(response.data.community);
        } catch (error) {
            console.error('Failed to fetch community detail', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (cmmntyId) fetchDetail();
    }, [cmmntyId]);

    if (loading) {
        return (
            <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
                <Skeleton className="h-10 w-[300px] rounded-2xl" />
                <Card className="border-none shadow-xl rounded-[2.5rem]"><CardContent className="p-16 space-y-10"><Skeleton className="h-14 w-full rounded-2xl" /><Skeleton className="h-32 w-full rounded-3xl" /></CardContent></Card>
            </div>
        );
    }

    if (!detail) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Community Profile Not Found</div>;

    return (
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-2xl w-fit border border-slate-100">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> Home
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link href="/cop/cmy/selectCommunityList" className="hover:text-foreground transition-colors font-bold">커뮤니티 관리</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-black">상세 정보</span>
            </div>

            <Card className="shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border-none overflow-hidden rounded-[3rem] bg-white ring-1 ring-slate-100">
                <CardHeader className="border-b bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-900 pb-20 pt-20 px-12 text-white relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="space-y-6 relative z-10 text-center md:text-left">
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-[2rem] flex items-center justify-center mx-auto md:mx-0 shadow-2xl scale-110">
                            <Users className="w-10 h-10 text-white" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-5xl md:text-6xl font-black tracking-tighter leading-tight uppercase italic">
                                {detail.cmmntyNm}
                            </CardTitle>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                <div className="px-5 py-2 bg-white/10 border border-white/20 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-lg backdrop-blur-2xl">
                                    Official Community
                                </div>
                                <div className="px-5 py-2 bg-blue-400 text-blue-950 font-black rounded-full text-xs uppercase tracking-[0.2em] shadow-xl">
                                    ID: {detail.cmmntyId}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-20 pb-24 px-12 md:px-20 space-y-20">
                    {/* Introduction Section */}
                    <div className="space-y-8">
                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" /> About this Community
                        </Label>
                        <div className="bg-slate-50/50 p-12 rounded-[2.5rem] border-2 border-slate-50 shadow-inner group hover:bg-white hover:shadow-2xl transition-all duration-500">
                            <p className="text-2xl font-bold text-slate-700 leading-relaxed italic text-center md:text-left">
                                "{detail.cmmntyIntrcn || '등록된 소개 문구가 없습니다. 환영 메시지를 관리자에게 요청하세요.'}"
                            </p>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8 bg-white p-10 rounded-[2.5rem] border-2 border-slate-50 shadow-xl hover:shadow-2xl transition-all group">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg group-hover:rotate-12 transition-transform">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Community Manager</p>
                                    <p className="text-xl font-black text-slate-900">{detail.frstRegisterNm}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 opacity-60">
                                <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 border border-slate-200">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Communication</p>
                                    <p className="text-lg font-bold text-slate-600 italic">E-mail Contact Required</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8 bg-white p-10 rounded-[2.5rem] border-2 border-slate-50 shadow-xl hover:shadow-2xl transition-all group">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg group-hover:rotate-12 transition-transform">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Founded Date</p>
                                    <p className="text-xl font-black text-slate-900">{detail.frstRegisterPnttm}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 opacity-60">
                                <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 border border-slate-200">
                                    <Layout className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Applied Template</p>
                                    <p className="text-lg font-bold text-slate-600 uppercase tracking-tighter">{detail.tmplatId || 'Standard v1.0'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Status Info */}
                    <div className="bg-slate-900 rounded-[3rem] p-12 text-center relative overflow-hidden group shadow-2xl">
                        <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-700" />
                        <div className="space-y-4 relative z-10">
                            <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                            <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">Ready to join our mission?</h3>
                            <p className="text-slate-400 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
                                커뮤니티는 공동의 목표와 관심을 가진 전문가들이 모여 지식을 공유하고 성장하는 곳입니다. <br />
                                현재 이 커뮤니티는 **매니저 승인** 후 가입이 완료됩니다.
                            </p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center py-16 border-t-2 border-slate-50 bg-slate-50/50 px-12 rounded-b-[3rem]">
                    <Link href="/cop/cmy/selectCommunityList">
                        <Button variant="ghost" className="h-20 px-16 gap-4 font-black uppercase tracking-[0.3em] text-xs text-slate-400 hover:bg-white hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] transition-all active:scale-95 border-2 border-transparent hover:border-slate-100 rounded-[1.5rem]">
                            <ArrowLeft className="w-6 h-6" /> Back to Dashboard
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
};

export default CommunityDetailPage;