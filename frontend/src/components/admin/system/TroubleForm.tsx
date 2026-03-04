'use client';

import React, { useState } from 'react';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { Trouble } from '@/services/troubleService';

interface TroubleFormProps {
  initialData?: Partial<Trouble>;
  onSubmit: (data: Partial<Trouble>) => Promise<void>;
  onCancel: () => void;
  isProcessMode?: boolean;
}

export function TroubleForm({ initialData, onSubmit, onCancel, isProcessMode }: TroubleFormProps) {
  const [formData, setFormData] = useState<Partial<Trouble>>({
    troblNm: '',
    troblKnd: '01',
    troblDc: '',
    troblRqesterNm: '',
    processSttus: 'R',
    ...initialData
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <StandardForm onSubmit={handleSubmit} className="border-none shadow-none rounded-none p-0">
      <div className="space-y-6">
        {/* 기본 정보 (작성/수정 모드) */}
        {!isProcessMode ? (
          <>
            <FormField label="장애 명칭" required>
              <input
                type="text"
                value={formData.troblNm || ''}
                onChange={(e) => setFormData({...formData, troblNm: e.target.value})}
                placeholder="장애 상황 요약"
                className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="장애 유형" required>
                <select
                  value={formData.troblKnd}
                  onChange={(e) => setFormData({...formData, troblKnd: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="01">서버 장애</option>
                  <option value="02">네트워크 장애</option>
                  <option value="03">보안/침해 사고</option>
                  <option value="04">어플리케이션 오류</option>
                  <option value="05">기타</option>
                </select>
              </FormField>
              <FormField label="신청자" required>
                <input
                  type="text"
                  value={formData.troblRqesterNm || ''}
                  onChange={(e) => setFormData({...formData, troblRqesterNm: e.target.value})}
                  placeholder="담당자 이름"
                  className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </FormField>
            </div>

            <FormField label="장애 상세 내용" required>
              <textarea
                value={formData.troblDc || ''}
                onChange={(e) => setFormData({...formData, troblDc: e.target.value})}
                placeholder="장애 증상 및 원인 등을 기술하세요."
                className="w-full min-h-[120px] p-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                required
              />
            </FormField>
          </>
        ) : (
          /* 처리 모드 (Process Mode) */
          <>
            <div className="p-4 bg-muted/30 rounded-xl mb-6">
              <h4 className="text-sm font-bold">{formData.troblNm}</h4>
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{formData.troblDc}</p>
            </div>

            <FormField label="처리 상태" required>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'P', label: '처리중', color: 'border-blue-200 bg-blue-50 text-blue-700' },
                  { value: 'C', label: '조치완료', color: 'border-green-200 bg-green-50 text-green-700' }
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setFormData({...formData, processSttus: s.value})}
                    className={`p-3 border rounded-xl text-center transition-all ${
                      formData.processSttus === s.value
                        ? `ring-2 ring-primary ring-offset-1 font-bold ${s.color}`
                        : 'bg-card hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <div className="text-xs">{s.label}</div>
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="처리 결과/조치 내역" required>
              <textarea
                value={formData.troblProcessResult || ''}
                onChange={(e) => setFormData({...formData, troblProcessResult: e.target.value})}
                placeholder="조치 완료된 내용을 상세히 기술하세요."
                className="w-full min-h-[120px] p-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                required
              />
            </FormField>

            <FormField label="처리 담당자" required>
              <input
                type="text"
                value={formData.troblOpetrNm || ''}
                onChange={(e) => setFormData({...formData, troblOpetrNm: e.target.value})}
                placeholder="본인 성명"
                className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </FormField>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-6">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg font-bold">취소</button>
        <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90 transition-all">
          {isProcessMode ? '처리 결과 저장' : '저장하기'}
        </button>
      </div>
    </StandardForm>
  );
}
