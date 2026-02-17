'use client';

import React, { useState } from 'react';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { ServerInfo } from '@/services/serverService';

interface ServerFormProps {
  initialData?: Partial<ServerInfo>;
  onSubmit: (data: Partial<ServerInfo>) => Promise<void>;
  onCancel: () => void;
}

export function ServerForm({ initialData, onSubmit, onCancel }: ServerFormProps) {
  const [formData, setFormData] = useState<Partial<ServerInfo>>({
    serverNm: '',
    serverKnd: '1',
    ...initialData
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <StandardForm onSubmit={handleSubmit} className="border-none shadow-none rounded-none p-0">
      <div className="space-y-6">
        <FormField label="서버 명칭" required>
          <input 
            type="text" 
            value={formData.serverNm || ''}
            onChange={(e) => setFormData({...formData, serverNm: e.target.value})}
            placeholder="예: 프로젝트 메인 WAS-01"
            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
        </FormField>
        
        <FormField label="서버 유형" required>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '1', label: 'WAS', color: 'border-orange-200 bg-orange-50 text-orange-700' },
              { value: '2', label: 'Database', color: 'border-blue-200 bg-blue-50 text-blue-700' },
              { value: '3', label: 'Web Server', color: 'border-green-200 bg-green-50 text-green-700' }
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({...formData, serverKnd: type.value})}
                className={`p-3 border rounded-xl text-center transition-all ${
                  formData.serverKnd === type.value 
                    ? `ring-2 ring-primary ring-offset-1 font-bold ${type.color}` 
                    : 'bg-card hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <div className="text-xs">{type.label}</div>
              </button>
            ))}
          </div>
        </FormField>

        {formData.serverKnd === '2' && (
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px] text-blue-700 leading-relaxed">
            데이터베이스 서버로 설정 시 자동 백업 정책 및 모니터링 대시보드에 연동됩니다.
          </div>
        )}
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
