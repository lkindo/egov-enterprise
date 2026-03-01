'use client';

import React, { useState } from 'react';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { Reward } from '@/services/admin/system/RewardAdminService';

interface RewardFormProps {
  initialData?: Partial<Reward>;
  onSubmit: (data: Partial<Reward>) => Promise<void>;
  onCancel: () => void;
}

export function RewardForm({ initialData, onSubmit, onCancel }: RewardFormProps) {
  const [formData, setFormData] = useState<Partial<Reward>>({
    rwdNm: '',
    rwdKnd: '1',
    rwdDe: new Date().toISOString().split('T')[0],
    usid: '',
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
        <FormField label="포상 명칭" required>
          <input
            type="text"
            value={formData.rwdNm || ''}
            onChange={(e) => setFormData({ ...formData, rwdNm: e.target.value })}
            placeholder="예: 2025년 우수 사원 포상"
            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="포상 종류" required>
            <select
              value={formData.rwdKnd}
              onChange={(e) => setFormData({ ...formData, rwdKnd: e.target.value })}
              className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="1">표창</option>
              <option value="2">포상금</option>
              <option value="3">포상 휴가</option>
              <option value="4">기타</option>
            </select>
          </FormField>
          <FormField label="포상 일자" required>
            <input
              type="date"
              value={formData.rwdDe || ''}
              onChange={(e) => setFormData({ ...formData, rwdDe: e.target.value })}
              className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </FormField>
        </div>

        <FormField label="대상자 ID" required>
          <input
            type="text"
            value={formData.usid || ''}
            onChange={(e) => setFormData({ ...formData, usid: e.target.value })}
            placeholder="직원 ID 입력"
            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
        </FormField>

        <FormField label="비고/설명">
          <textarea
            value={formData.remark || ''}
            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            placeholder="상세 내용을 입력하세요."
            className="w-full min-h-[100px] p-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none"
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
