'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { getTermsDetail, updateTerms, deleteTerms } from '@/services/terms/termsService';
import { StplatManageVO } from '@/types/terms';

export default function TermsDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const termsId = params.id;
    const [formData, setFormData] = useState<StplatManageVO | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const data = await getTermsDetail(termsId);
            setFormData(data);
        } catch (error) {
            console.error(error);
            alert('약관 정보를 불러오는데 실패했습니다.');
            router.back();
        }
    }, [termsId, router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async () => {
        if (!formData || !formData.useStplatNm || !formData.useStplatCn) {
            alert('약관명과 내용은 필수입니다.');
            return;
        }

        try {
            await updateTerms(formData);
            alert('약관이 수정되었습니다.');
            router.push('/admin/terms');
        } catch (error) {
            console.error(error);
            alert('약관 수정에 실패했습니다.');
        }
    };

    const handleDelete = async () => {
        if (!confirm('정말로 이 약관을 삭제하시겠습니까?')) return;

        try {
            await deleteTerms(termsId);
            alert('약관이 삭제되었습니다.');
            router.push('/admin/terms');
        } catch (error) {
            console.error(error);
            alert('약관 삭제에 실패했습니다.');
        }
    };

    if (!formData) return <div>Loading...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">약관 상세 및 수정</h2>
                    <p className="text-muted-foreground">등록된 이용약관을 수정하거나 삭제합니다.</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="useStplatNm">약관명 (필수)</Label>
                    <Input
                        id="useStplatNm"
                        value={formData.useStplatNm}
                        onChange={(e) => setFormData(prev => prev ? ({ ...prev, useStplatNm: e.target.value }) : null)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="useStplatCn">약관 내용 (필수)</Label>
                    <Textarea
                        id="useStplatCn"
                        value={formData.useStplatCn}
                        onChange={(e) => setFormData(prev => prev ? ({ ...prev, useStplatCn: e.target.value }) : null)}
                        className="min-h-[200px]"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="infoProvdAgreCn">정보제공동의 내용 (선택)</Label>
                    <Textarea
                        id="infoProvdAgreCn"
                        value={formData.infoProvdAgreCn}
                        onChange={(e) => setFormData(prev => prev ? ({ ...prev, infoProvdAgreCn: e.target.value }) : null)}
                        className="min-h-[150px]"
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
