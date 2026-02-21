'use client';

import React, { useState } from 'react';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { SyncServer } from '@/services/syncService';

interface SyncServerFormProps {
  initialData?: Partial<SyncServer>;
  onSubmit: (data: Partial<SyncServer>) => Promise<void>;
  onCancel: () => void;
}

export function SyncServerForm({ initialData, onSubmit, onCancel }: SyncServerFormProps) {
  const [formData, setFormData] = useState<Partial<SyncServer>>({
    serverNm: '',
    serverIp: '',
    serverPort: '',
    targetDrctry: '',
    syncAt: 'Y',
    ...initialData
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <StandardForm onSubmit={handleSubmit} className="border-none shadow-none rounded-none p-0">
      <div className="space-y-6">
        <FormField label="동기화 서버명" required>
          <input 
            type="text" 
            value={formData.serverNm || ''}
            onChange={(e) => setFormData({...formData, serverNm: e.target.value})}
            placeholder="예: 백업용 2호기 서버"
            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
        </FormField>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="IP 주소" required>
            <input 
              type="text" 
              value={formData.serverIp || ''}
              onChange={(e) => setFormData({...formData, serverIp: e.target.value})}
              placeholder="10.0.0.1"
              className="w-full h-10 px-3 rounded-md border bg-background font-mono outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </FormField>
          <FormField label="포트 (Port)" required>
            <input
              type="number"
              value={formData.serverPort || ''}
              onChange={(e) => setFormData({...formData, serverPort: parseInt(e.target.value) || 0})}
              placeholder="22"
              className="w-full h-10 px-3 rounded-md border bg-background font-mono outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </FormField>
        </div>

        <FormField label="대상 디렉토리" required>
          <input 
            type="text" 
            value={formData.targetDrctry || ''}
            onChange={(e) => setFormData({...formData, targetDrctry: e.target.value})}
            placeholder="/data/sync_backup"
            className="w-full h-10 px-3 rounded-md border bg-background font-mono outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
        </FormField>

        <FormField label="동기화 활성화" required>
          <select 
            value={formData.syncAt}
            onChange={(e) => setFormData({...formData, syncAt: e.target.value as 'Y' | 'N'})}
            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="Y">활성 (동기화 수행)</option>
            <option value="N">중지 (동기화 제외)</option>
          </select>
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
