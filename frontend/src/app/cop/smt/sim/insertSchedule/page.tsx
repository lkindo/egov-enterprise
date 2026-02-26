'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, FileText, ArrowLeft, Send, Home, ChevronRight } from "lucide-react";

const InsertSchedulePage = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        schdulNm: '',
        schdulBgnde: '',
        schdulEndde: '',
        schdulPlace: '',
        schdulCn: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.schdulNm.trim()) {
            alert('일정명을 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            const response = (await axios.post('/schedule', formData)) as any;
            if (response.data.success) {
                alert(response.data.message);
                router.push('/cop/smt/sim/selectScheduleList');
            }
        } catch (error: any) {
            alert(error.response?.data?.message || '등록에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg w-fit">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> Home
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link href="/cop/smt/sim/selectScheduleList" className="hover:text-foreground transition-colors font-medium">일정관리</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-semibold">새 일정 등록</span>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden ring-1 ring-primary/5">
                <CardHeader className="border-b bg-primary/5 pb-10 pt-10 px-10">
                    <CardTitle className="text-3xl font-black tracking-tighter flex items-center gap-4 text-primary uppercase">
                        <Calendar className="w-10 h-10" /> 신규 일정 캘린더 등록
                    </CardTitle>
                    <p className="mt-2 text-sm font-bold text-muted-foreground/80 leading-relaxed max-w-2xl">
                        협업을 위한 새로운 일정을 등록합니다. 일시와 장소, 상세 내용을 정확히 기입하여 팀원들과 공유하세요.
                    </p>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="pt-12 px-10 space-y-10">
                        <div className="space-y-4">
                            <Label htmlFor="schdulNm" className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <span className="text-destructive font-black">*</span> 일정 제목
                            </Label>
                            <Input
                                id="schdulNm"
                                placeholder="일정 명칭을 입력하세요 (예: 팀 정기 회의)"
                                className="h-14 text-xl font-black border-2 focus-visible:ring-primary/20 shadow-sm"
                                value={formData.schdulNm}
                                onChange={(e) => setFormData({ ...formData, schdulNm: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-muted/20 p-8 rounded-3xl border-2 border-dashed border-primary/10">
                            <div className="space-y-4">
                                <Label htmlFor="schdulBgnde" className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                    시작 일자
                                </Label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 z-10" />
                                    <Input
                                        id="schdulBgnde"
                                        type="date"
                                        className="h-12 pl-12 font-bold font-mono text-base border-2 focus:border-blue-400 bg-white"
                                        value={formData.schdulBgnde}
                                        onChange={(e) => setFormData({ ...formData, schdulBgnde: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <Label htmlFor="schdulEndde" className="text-xs font-black uppercase tracking-widest text-rose-600 flex items-center gap-2">
                                    종료 일자
                                </Label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 z-10" />
                                    <Input
                                        id="schdulEndde"
                                        type="date"
                                        className="h-12 pl-12 font-bold font-mono text-base border-2 focus:border-rose-400 bg-white"
                                        value={formData.schdulEndde}
                                        onChange={(e) => setFormData({ ...formData, schdulEndde: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label htmlFor="schdulPlace" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5" /> 진행 장소
                            </Label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 z-10" />
                                <Input
                                    id="schdulPlace"
                                    placeholder="상세 장소 (예: 본사 4층 대회의실)"
                                    className="h-12 pl-12 font-bold border-2 focus-visible:ring-primary/20 bg-muted/10 shadow-inner"
                                    value={formData.schdulPlace}
                                    onChange={(e) => setFormData({ ...formData, schdulPlace: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label htmlFor="schdulCn" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" /> 상세 설명 및 안건
                            </Label>
                            <Textarea
                                id="schdulCn"
                                placeholder="회의 안건이나 준비물 등 상세 내용을 기록하세요"
                                className="min-h-[220px] p-6 text-base font-medium leading-relaxed border-2 focus-visible:ring-primary/20 bg-white shadow-sm resize-none rounded-2xl"
                                value={formData.schdulCn}
                                onChange={(e) => setFormData({ ...formData, schdulCn: e.target.value })}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-6 py-12 border-t bg-muted/30 px-10 rounded-b-xl">
                        <Link href="/cop/smt/sim/selectScheduleList">
                            <Button type="button" variant="ghost" className="h-14 px-12 font-black uppercase tracking-widest text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95">
                                <ArrowLeft className="w-5 h-5 mr-2" /> 취소하고 돌아가기
                            </Button>
                        </Link>
                        <Button type="submit" className="h-14 px-16 gap-3 font-black uppercase tracking-widest shadow-2xl bg-primary hover:bg-primary/90 transition-all active:scale-95 ring-4 ring-primary/20" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2 animate-pulse font-black">심는 중...</span>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" /> 캘린더에 일정 추가하기
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default InsertSchedulePage;
