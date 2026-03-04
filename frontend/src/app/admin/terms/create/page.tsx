'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTerms } from '@/services/terms/termsService';
import { StplatManageVO } from '@/types/terms';

export default function CreateTermsPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<StplatManageVO>({
        useStplatNm: '',
        useStplatCn: '',
        infoProvdAgreCn: '',
    });

    const handleSave = async () => {
        if (!formData.useStplatNm || !formData.useStplatCn) {
            alert('약관명과 내용은 필수입니다.');
            return;
        }

        try {
            await createTerms(formData);
            alert('약관이 등록되었습니다.');
            router.push('/admin/terms');
        } catch (error) {
            console.error(error);
            alert('약관 등록에 실패했습니다.');
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">약관 등록</h2>
                <p className="text-muted-foreground">새로운 이용약관을 등록합니다.</p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="useStplatNm">약관명 (필수)</Label>
                    <Input
                        id="useStplatNm"
                        value={formData.useStplatNm}
                        onChange={(e) => setFormData(prev => ({ ...prev, useStplatNm: e.target.value }))}
                        placeholder="예: 이용약관 V1.0"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="useStplatCn">약관 내용 (필수)</Label>
                    <Textarea
                        id="useStplatCn"
                        value={formData.useStplatCn}
                        onChange={(e) => setFormData(prev => ({ ...prev, useStplatCn: e.target.value }))}
                        className="min-h-[200px]"
                        placeholder="약관 전체 내용을 입력하세요."
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="infoProvdAgreCn">정보제공동의 내용 (선택)</Label>
                    <Textarea
                        id="infoProvdAgreCn"
                        value={formData.infoProvdAgreCn}
                        onChange={(e) => setFormData(prev => ({ ...prev, infoProvdAgreCn: e.target.value }))}
                        className="min-h-[150px]"
                        placeholder="개인정보 수집 및 이용 동의 내용..."
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.back()}>취소</Button>
                    <Button onClick={handleSave}>저장</Button>
                </div>
            </div>
        </div>
    );
}
