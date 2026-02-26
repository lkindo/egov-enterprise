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
import { Briefcase, FileText, User, Calendar, ArrowLeft, Save, Edit, Trash2, Home, ChevronRight, Activity, AlertCircle } from "lucide-react";

interface DeptJobDetail {
    deptJobId: string;
    deptJobNm: string;
    deptJobCn: string;
    frstRegisterNm: string;
    frstRegisterPnttm: string;
    priort: string;
}

const DeptJobDetailPage = () => {
    const params = useParams();
    const router = useRouter();
    const deptJobId = params.id as string;

    const [detail, setDetail] = useState<DeptJobDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        deptJobNm: '',
        deptJobCn: '',
        priort: '3'
    });
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const response = (await axios.get(`/deptjob/${deptJobId}`)) as any;
            const data = response.data.deptJob;
            setDetail(data);
            setFormData({
                deptJobNm: data.deptJobNm || '',
                deptJobCn: data.deptJobCn || '',
                priort: data.priort || '3'
            });
        } catch (error) {
            console.error('Failed to fetch dept job detail', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (deptJobId) fetchDetail();
    }, [deptJobId]);

    const handleUpdate = async () => {
        setActionLoading(true);
        try {
            const response = (await axios.put(`/deptjob/${deptJobId}`, formData)) as any;
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
            const response = (await axios.delete(`/deptjob/${deptJobId}`)) as any;
            if (response.data.success) {
                alert(response.data.message);
                router.push('/cop/smt/djm/selectDeptJobList');
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
                <Skeleton className="h-10 w-[300px] rounded-2xl" />
                <Card className="border-none shadow-md rounded-[2rem]"><CardContent className="p-16 space-y-8"><Skeleton className="h-12 w-full" /><Skeleton className="h-40 w-full" /></CardContent></Card>
            </div>
        );
    }

    if (!detail) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Task Not Found</div>;

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-2xl w-fit border border-slate-100">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> Home
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link href="/cop/smt/djm/selectDeptJobList" className="hover:text-foreground transition-colors font-bold">부서업무 관리</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-black">업무 상세</span>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-[3rem] bg-white ring-1 ring-slate-100">
                <CardHeader className="border-b bg-slate-50/50 pb-12 pt-12 px-10">
                    <div className="flex items-start justify-between">
                        <div className="space-y-4">
                            <CardTitle className="text-3xl font-black tracking-tight flex items-center gap-4 text-slate-900 leading-tight">
                                <Briefcase className="w-8 h-8 text-primary" /> {isEditing ? '업무 프로필 수정' : '업무 상세 사양'}
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                <div className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                    Priority Level : {detail.priort === '1' ? 'High' : detail.priort === '2' ? 'Medium' : 'Low'}
                                </div>
                            </div>
                        </div>
                        {!isEditing && (
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="gap-2 shadow-sm font-black rounded-2xl border bg-white hover:bg-slate-50">
                                    <Edit className="w-4 h-4" /> Edit
                                </Button>
                                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={actionLoading} className="gap-2 shadow-xl font-black rounded-2xl transition-all active:scale-95">
                                    <Trash2 className="w-4 h-4" /> Delete
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-16 pb-20 px-10 md:px-16 space-y-12">
                    {/* Task Name Section */}
                    <div className="space-y-4 group">
                        <Label htmlFor="deptJobNm" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                            <Activity className="w-4 h-4 text-primary" /> Professional Task Name
                        </Label>
                        {isEditing ? (
                            <Input
                                id="deptJobNm"
                                value={formData.deptJobNm}
                                onChange={(e) => setFormData({ ...formData, deptJobNm: e.target.value })}
                                className="h-16 text-2xl font-black border-2 border-slate-50 focus:border-slate-900 focus-visible:ring-slate-100 transition-all rounded-[1.5rem] px-8 bg-slate-50/50"
                            />
                        ) : (
                            <div className="text-4xl font-black text-slate-900 leading-tight border-l-8 border-primary pl-8 py-2">
                                {detail.deptJobNm}
                            </div>
                        )}
                    </div>

                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-dashed hover:border-primary/20 transition-colors">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Assigned Owner</Label>
                            <div className="text-xl font-black text-slate-800 flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                                    <User className="w-5 h-5 text-slate-400" />
                                </div>
                                {detail.frstRegisterNm}
                            </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-3xl border border-dashed hover:border-primary/20 transition-colors">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Registration Date</Label>
                            <div className="text-xl font-black text-slate-800 flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-slate-400" />
                                </div>
                                {detail.frstRegisterPnttm?.substring(0, 10)}
                            </div>
                        </div>
                    </div>

                    {/* Priority Selector (Editing) */}
                    {isEditing && (
                        <div className="space-y-4">
                            <Label htmlFor="priort" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                                <AlertCircle className="w-4 h-4 text-primary" /> Assign Priority Level
                            </Label>
                            <select
                                id="priort"
                                value={formData.priort}
                                onChange={(e) => setFormData({ ...formData, priort: e.target.value })}
                                className="w-full h-16 px-8 text-xl font-black border-2 border-slate-50 focus:border-slate-900 transition-all rounded-[1.5rem] bg-slate-50/50 outline-none appearance-none cursor-pointer"
                            >
                                <option value="1">HIGH PRIORITY (CRITICAL)</option>
                                <option value="2">MEDIUM PRIORITY (STANDARD)</option>
                                <option value="3">LOW PRIORITY (DEFERRED)</option>
                            </select>
                        </div>
                    )}

                    {/* Task Description */}
                    <div className="space-y-6">
                        <Label htmlFor="deptJobCn" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                            <FileText className="w-4 h-4 text-primary" /> Full Task Specifications
                        </Label>
                        {isEditing ? (
                            <Textarea
                                id="deptJobCn"
                                value={formData.deptJobCn}
                                onChange={(e) => setFormData({ ...formData, deptJobCn: e.target.value })}
                                rows={10}
                                className="p-8 text-lg font-medium leading-relaxed border-2 border-slate-50 focus:border-slate-900 focus-visible:ring-slate-100 transition-all rounded-[2.5rem] bg-slate-50/50 shadow-inner resize-none"
                            />
                        ) : (
                            <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-50 min-h-[300px] shadow-[inset_0_4px_32px_rgba(0,0,0,0.02)] font-medium text-slate-700 leading-loose text-xl whitespace-pre-wrap">
                                {detail.deptJobCn || '상세 업무 설명이 기입되지 않았습니다.'}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center py-14 border-t-2 border-slate-50 bg-slate-50/30 px-10 rounded-b-[2.5rem]">
                    <Link href="/cop/smt/djm/selectDeptJobList">
                        <Button variant="ghost" className="h-16 px-16 gap-4 font-black uppercase tracking-[0.3em] text-xs text-slate-400 hover:bg-white hover:shadow-2xl transition-all rounded-[1.25rem] active:scale-95 border-2 border-transparent hover:border-slate-100">
                            <ArrowLeft className="w-6 h-6" /> Back to Task Board
                        </Button>
                    </Link>
                    {isEditing && (
                        <>
                            <Button onClick={handleUpdate} className="h-16 px-20 gap-4 font-black uppercase tracking-[0.3em] text-xs shadow-2xl bg-slate-900 hover:bg-black transition-all active:scale-95 ring-[16px] ring-slate-100 rounded-[1.25rem] ml-6" disabled={actionLoading}>
                                <Save className="w-6 h-6" /> Save Specifications
                            </Button>
                            <Button variant="ghost" onClick={() => setIsEditing(false)} className="h-16 px-12 font-black uppercase tracking-[0.3em] text-[10px] text-rose-400 hover:text-rose-600 transition-all rounded-[1.25rem]">
                                Discard Changes
                            </Button>
                        </>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default DeptJobDetailPage;
