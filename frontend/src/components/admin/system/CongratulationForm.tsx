'use client';

import React, { useState } from 'react';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { CongratulationManage } from '@/services/congratulationService';

interface CongratulationFormProps {
    initialData?: Partial<CongratulationManage>;
    onSubmit: (data: Partial<CongratulationManage>) => Promise<void>;
    onCancel: () => void;
}

export function CongratulationForm({ initialData, onSubmit, onCancel }: CongratulationFormProps) {
    const [formData, setFormData] = useState<Partial<CongratulationManage>>({
        usid: '',
        ctsnnCode: '1',
        ctsnnNm: '',
        occrrncDe: new Date().toISOString().split('T')[0],
        trgetNm: '',
        relate: '1',
        confmAt: 'N',
        ...initialData
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <StandardForm onSubmit={handleSubmit} className="border-none shadow-none rounded-none p-0">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="사용자 ID" required>
                        <input
                            type="text"
                            value={formData.usid || ''}
                            onChange={(e) => setFormData({ ...formData, usid: e.target.value })}
                            placeholder="직원 ID"
                            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                            required
                        />
                    </FormField>
                    <FormField label="경조사 명칭" required>
                        <input
                            type="text"
                            value={formData.ctsnnNm || ''}
                            onChange={(e) => setFormData({ ...formData, ctsnnNm: e.target.value })}
                            placeholder="예: 부친상, 본인결혼 등"
                            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                            required
                        />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="경조 구분" required>
                        <select
                            value={formData.ctsnnCode}
                            onChange={(e) => setFormData({ ...formData, ctsnnCode: e.target.value })}
                            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="1">결혼</option>
                            <option value="2">부고</option>
                            <option value="3">칠순/팔순</option>
                            <option value="4">기타</option>
                        </select>
                    </FormField>
                    <FormField label="발생 일자" required>
                        <input
                            type="date"
                            value={formData.occrrncDe || ''}
                            onChange={(e) => setFormData({ ...formData, occrrncDe: e.target.value })}
                            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                            required
                        />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="대상자 성명" required>
                        <input
                            type="text"
                            value={formData.trgetNm || ''}
                            onChange={(e) => setFormData({ ...formData, trgetNm: e.target.value })}
                            placeholder="대상자 이름"
                            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                            required
                        />
                    </FormField>
                    <FormField label="관계" required>
                        <select
                            value={formData.relate}
                            onChange={(e) => setFormData({ ...formData, relate: e.target.value })}
                            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="1">본인</option>
                            <option value="2">부</option>
                            <option value="3">모</option>
                            <option value="4">배우자</option>
                            <option value="5">자녀</option>
                            <option value="6">조부모</option>
                            <option value="7">형제자매</option>
                        </select>
                    </FormField>
                </div>

                <FormField label="비고/특이사항">
                    <textarea
                        value={formData.remark || ''}
                        onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                        className="w-full min-h-[80px] p-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                </FormField>
            </div>

            <div className="flex justify-end gap-2 pt-6">
                <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg font-bold">취소</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90 transition-all">
                    저장하기
                </button>
            </div>
        </StandardForm>
    );
}
