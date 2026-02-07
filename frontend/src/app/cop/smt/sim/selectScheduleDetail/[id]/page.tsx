'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, FileText, ArrowLeft, Save, Edit, Trash2, Home, ChevronRight, User } from "lucide-react";

interface ScheduleDetail {
    schdulId: string;
    schdulNm: string;
    schdulBgnde: string;
    schdulEndde: string;
    schdulPlace: string;
    schdulCn: string;
    frstRegisterId: string;
    frstRegisterPnttm: string;
}

const ScheduleDetailPage = () => {
    const params = useParams();
    const router = useRouter();
    const schdulId = params.id as string;

    const [detail, setDetail] = useState<ScheduleDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        schdulNm: '',
        schdulBgnde: '',
        schdulEndde: '',
        schdulPlace: '',
        schdulCn: ''
    });
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/schedule/${schdulId}`);
            const data = response.data.schedule;
            setDetail(data);
            setFormData({
                schdulNm: data.schdulNm || '',
                schdulBgnde: data.schdulBgnde?.substring(0, 10) || '',
                schdulEndde: data.schdulEndde?.substring(0, 10) || '',
                schdulPlace: data.schdulPlace || '',
                schdulCn: data.schdulCn || ''
            });
        } catch (error) {
            console.error('Failed to fetch schedule detail', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (schdulId) fetchDetail();
    }, [schdulId]);

    const handleUpdate = async () => {
        setActionLoading(true);
        try {
            const response = await axios.put(`/schedule/${schdulId}`, formData);
            if (response.data.success) {
                alert(response.data.message);
                setIsEditing(false);
                fetchDetail();
            }
        } catch (error: any) {
            alert(error.response?.data?.message || '수정에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        setActionLoading(true);
        try {
            const response = await axios.delete(`/schedule/${schdulId}`);
            if (response.data.success) {
                alert(response.data.message);
                router.push('/cop/smt/sim/selectScheduleList');
            }
        } catch (error: any) {
            alert(error.response?.data?.message || '삭제에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
                <Skeleton className="h-10 w-[300px]" />
                <Card className="border-none shadow-md"><CardContent className="p-10 space-y-8"><Skeleton className="h-12 w-full" /><Skeleton className="h-32 w-full" /></CardContent></Card>
            </div>
        );
    }

    if (!detail) return <div className="p-10 text-center font-medium">일정 정보를 찾을 수 없습니다.</div>;

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
                <span className="text-foreground font-semibold">상세 정보</span>
            </div>

            <Card className="shadow-xl border-none overflow-hidden">
                <CardHeader className="border-b bg-primary/5 pb-8 pt-8 px-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-3xl font-black tracking-tight flex items-center gap-3 text-primary uppercase">
                                <Calendar className="w-8 h-8" /> {isEditing ? '일정 정보 수정' : '일정 상세 정보'}
                            </CardTitle>
                            <p className="text-sm font-medium text-muted-foreground">이벤트의 상세 내용을 확인하고 수정할 수 있습니다.</p>
                        </div>
                        {!isEditing && (
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="gap-2 border shadow-sm font-bold">
                                    <Edit className="w-4 h-4" /> 수정
                                </Button>
                                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={actionLoading} className="gap-2 shadow-md font-bold">
                                    <Trash2 className="w-4 h-4" /> 삭제
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-10 px-8 space-y-10">
                    <div className="grid grid-cols-1 gap-8">
                        {/* Title Section */}
                        <div className="space-y-3">
                            <Label htmlFor="schdulNm" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" /> 일정명
                            </Label>
                            {isEditing ? (
                                <Input
                                    id="schdulNm"
                                    value={formData.schdulNm}
                                    onChange={(e) => setFormData({ ...formData, schdulNm: e.target.value })}
                                    className="h-12 text-lg font-bold border-2 focus-visible:ring-primary/20"
                                />
                            ) : (
                                <div className="text-2xl font-black text-foreground border-l-4 border-primary pl-4 py-1">{detail.schdulNm}</div>
                            )}
                        </div>

                        {/* DateTime Picker Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-muted/30 p-6 rounded-2xl border border-dashed hover:border-primary/30 transition-colors group">
                            <div className="space-y-3">
                                <Label htmlFor="schdulBgnde" className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" /> 시작 일시
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="schdulBgnde"
                                        type="date"
                                        value={formData.schdulBgnde}
                                        onChange={(e) => setFormData({ ...formData, schdulBgnde: e.target.value })}
                                        className="h-11 font-mono font-bold"
                                    />
                                ) : (
                                    <div className="text-lg font-black font-mono text-blue-700 tracking-tighter">{detail.schdulBgnde?.substring(0, 10)}</div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="schdulEndde" className="text-xs font-black uppercase tracking-widest text-rose-600 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" /> 종료 일시
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="schdulEndde"
                                        type="date"
                                        value={formData.schdulEndde}
                                        onChange={(e) => setFormData({ ...formData, schdulEndde: e.target.value })}
                                        className="h-11 font-mono font-bold"
                                    />
                                ) : (
                                    <div className="text-lg font-black font-mono text-rose-700 tracking-tighter">{detail.schdulEndde?.substring(0, 10)}</div>
                                )}
                            </div>
                        </div>

                        {/* Location Section */}
                        <div className="space-y-3">
                            <Label htmlFor="schdulPlace" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5" /> 장소
                            </Label>
                            {isEditing ? (
                                <Input
                                    id="schdulPlace"
                                    value={formData.schdulPlace}
                                    onChange={(e) => setFormData({ ...formData, schdulPlace: e.target.value })}
                                    className="h-11 border-2"
                                    placeholder="장소를 입력하세요"
                                />
                            ) : (
                                <div className="text-base font-bold text-foreground bg-muted/50 p-4 rounded-xl flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary opacity-60" /> {detail.schdulPlace || '미지정'}
                                </div>
                            )}
                        </div>

                        {/* Content Section */}
                        <div className="space-y-3">
                            <Label htmlFor="schdulCn" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" /> 상세 내용
                            </Label>
                            {isEditing ? (
                                <Textarea
                                    id="schdulCn"
                                    value={formData.schdulCn}
                                    onChange={(e) => setFormData({ ...formData, schdulCn: e.target.value })}
                                    rows={8}
                                    className="text-base leading-relaxed border-2 focus-visible:ring-primary/20"
                                    placeholder="상세 내용을 상세히 입력하세요"
                                />
                            ) : (
                                <div className="bg-muted/10 p-6 rounded-2xl border min-h-[150px] whitespace-pre-wrap leading-relaxed font-medium text-foreground/80 scrollbar-thin scrollbar-thumb-primary/20">
                                    {detail.schdulCn || '내용이 없습니다.'}
                                </div>
                            )}
                        </div>
                    </div>

                    {!isEditing && (
                        <div className="pt-8 border-t border-dashed grid grid-cols-2 gap-4 text-xs font-bold text-muted-foreground bg-muted/5 p-5 rounded-2xl border">
                            <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
                                등록자 : <span className="text-foreground font-black">{detail.frstRegisterId}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
                                등록일 : <span className="text-foreground font-black">{detail.frstRegisterPnttm?.substring(0, 10)}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center gap-5 py-10 border-t bg-muted/20 rounded-b-xl px-8">
                    <Link href="/cop/smt/sim/selectScheduleList">
                        <Button variant="outline" className="h-12 px-10 gap-2 font-black uppercase tracking-tighter shadow-md hover:bg-muted active:scale-95 transition-all">
                            <ArrowLeft className="w-4 h-4" /> 목록으로 돌아가기
                        </Button>
                    </Link>
                    {isEditing && (
                        <>
                            <Button onClick={handleUpdate} className="h-12 px-12 gap-2 font-black uppercase tracking-tighter shadow-xl bg-primary hover:bg-primary/90 transition-all active:scale-95" disabled={actionLoading}>
                                <Save className="w-4 h-4" /> 수정 완료 및 저장
                            </Button>
                            <Button variant="ghost" onClick={() => setIsEditing(false)} className="h-12 px-10 font-bold uppercase transition-all hover:bg-destructive/10 hover:text-destructive">
                                취소
                            </Button>
                        </>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default ScheduleDetailPage;
