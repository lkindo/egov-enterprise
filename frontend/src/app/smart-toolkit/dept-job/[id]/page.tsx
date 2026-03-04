'use client';

import React, { useState, useCallback, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { getDeptJobDetail, updateDeptJob, deleteDeptJob } from '@/services/deptJob/deptJobService';
import { DeptJobVO } from '@/types/deptJob';

export default function DeptJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: deptJobId } = use(params);
    const router = useRouter();
    const [formData, setFormData] = useState<DeptJobVO | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const data = await getDeptJobDetail(deptJobId);
            setFormData(data);
        } catch (error) {
            console.error(error);
            alert('?낅Т ?뺣낫瑜?遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.');
            router.back();
        }
    }, [deptJobId, router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async () => {
        if (!formData || !formData.deptJobNm || !formData.deptJobCn) {
            alert('?낅Т紐낃낵 ?댁슜? ?꾩닔?낅땲??');
            return;
        }

        try {
            await updateDeptJob(formData);
            alert('?낅Т媛 ?섏젙?섏뿀?듬땲??');
            router.push('/smart-toolkit/dept-job');
        } catch (error) {
            console.error(error);
            alert('?낅Т ?섏젙???ㅽ뙣?덉뒿?덈떎.');
        }
    };

    const handleDelete = async () => {
        if (!confirm('?뺣쭚濡????낅Т瑜???젣?섏떆寃좎뒿?덇퉴?')) return;
        try {
            await deleteDeptJob(deptJobId);
            alert('?낅Т媛 ??젣?섏뿀?듬땲??');
            router.push('/smart-toolkit/dept-job');
        } catch (error) {
            console.error(error);
            alert('??젣 ?ㅽ뙣');
        }
    };

    if (!formData) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">遺???낅Т ?곸꽭 諛??섏젙</h2>
                    <p className="text-muted-foreground">?깅줉???낅Т ?댁슜???섏젙?섍굅????젣?⑸땲??</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="deptJobNm">업무명</Label>
                    <Input
                        id="deptJobNm"
                        value={formData.deptJobNm}
                        onChange={(e) => setFormData(prev => prev ? ({ ...prev, deptJobNm: e.target.value }) : null)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="priort">?곗꽑?쒖쐞</Label>
                    <Select
                        value={formData.priort}
                        onValueChange={(value) => setFormData(prev => prev ? ({ ...prev, priort: value }) : null)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="?곗꽑?쒖쐞 ?좏깮" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">?믪쓬</SelectItem>
                            <SelectItem value="2">蹂댄넻</SelectItem>
                            <SelectItem value="3">??쓬</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="chargerNm">담당자</Label>
                    <Input
                        id="chargerNm"
                        value={formData.chargerNm || ''}
                        onChange={(e) => setFormData(prev => prev ? ({ ...prev, chargerNm: e.target.value }) : null)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="deptJobCn">?낅Т ?댁슜</Label>
                    <Textarea
                        id="deptJobCn"
                        value={formData.deptJobCn}
                        onChange={(e) => setFormData(prev => prev ? ({ ...prev, deptJobCn: e.target.value }) : null)}
                        className="min-h-[200px]"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground pt-4 border-t">
                    <div>
                        <span className="font-semibold">?깅줉??</span> {formData.frstRegisterId}
                    </div>
                    <div>
                        <span className="font-semibold">?깅줉??</span> {formData.frstRegistPnttm?.slice(0, 10)}
                    </div>
                </div>

                <div className="flex justify-between pt-4">
                    <Button variant="destructive" onClick={handleDelete}>??젣</Button>
                    <div className="space-x-2">
                        <Button variant="outline" onClick={() => router.back()}>痍⑥냼</Button>
                        <Button onClick={handleSave}>수정 저장</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}