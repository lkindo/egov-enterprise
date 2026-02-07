'use client';

import { useState, useCallback, useEffect } from 'react';
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

export default function DeptJobDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const deptJobId = params.id;
    const [formData, setFormData] = useState<DeptJobVO | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const data = await getDeptJobDetail(deptJobId);
            setFormData(data);
        } catch (error) {
            console.error(error);
            alert('업무 정보를 불러오는데 실패했습니다.');
            router.back();
        }
    }, [deptJobId, router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async () => {
        if (!formData || !formData.deptJobNm || !formData.deptJobCn) {
            alert('업무명과 내용은 필수입니다.');
            return;
        }

        try {
            await updateDeptJob(formData);
            alert('업무가 수정되었습니다.');
            router.push('/cop/smt/djm');
        } catch (error) {
            console.error(error);
            alert('업무 수정에 실패했습니다.');
        }
    };

    const handleDelete = async () => {
        if (!confirm('정말로 이 업무를 삭제하시겠습니까?')) return;
        try {
            await deleteDeptJob(deptJobId);
            alert('업무가 삭제되었습니다.');
            router.push('/cop/smt/djm');
        } catch (error) {
            console.error(error);
            alert('삭제 실패');
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
                    <h2 className="text-2xl font-bold tracking-tight">부서 업무 상세 및 수정</h2>
                    <p className="text-muted-foreground">등록된 업무 내용을 수정하거나 삭제합니다.</p>
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
                    <Label htmlFor="priort">우선순위</Label>
                    <Select
                        value={formData.priort}
                        onValueChange={(value) => setFormData(prev => prev ? ({ ...prev, priort: value }) : null)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="우선순위 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">높음</SelectItem>
                            <SelectItem value="2">보통</SelectItem>
                            <SelectItem value="3">낮음</SelectItem>
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
                    <Label htmlFor="deptJobCn">업무 내용</Label>
                    <Textarea
                        id="deptJobCn"
                        value={formData.deptJobCn}
                        onChange={(e) => setFormData(prev => prev ? ({ ...prev, deptJobCn: e.target.value }) : null)}
                        className="min-h-[200px]"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground pt-4 border-t">
                    <div>
                        <span className="font-semibold">등록자:</span> {formData.frstRegisterId}
                    </div>
                    <div>
                        <span className="font-semibold">등록일:</span> {formData.frstRegistPnttm?.slice(0, 10)}
                    </div>
                </div>

                <div className="flex justify-between pt-4">
                    <Button variant="destructive" onClick={handleDelete}>삭제</Button>
                    <div className="space-x-2">
                        <Button variant="outline" onClick={() => router.back()}>취소</Button>
                        <Button onClick={handleSave}>수정 저장</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
