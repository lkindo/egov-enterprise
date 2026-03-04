'use client';

import React, { useState } from 'react';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { BackupOpert } from '@/services/admin/system/BackupAdminService';

interface BackupFormProps {
  initialData?: Partial<BackupOpert>;
  onSubmit: (data: Partial<BackupOpert>) => Promise<void>;
  onCancel: () => void;
}

export function BackupForm({ initialData, onSubmit, onCancel }: BackupFormProps) {
  const [formData, setFormData] = useState<Partial<BackupOpert>>({
    backupOpertNm: '',
    backupOrginlDrctry: '',
    backupStreDrctry: '',
    cmprsSe: '01',
    executCycle: '01',
    executSchdulHour: '00',
    executSchdulMnt: '00',
    executSchdulSecnd: '00',
    useAt: 'Y',
    ...initialData
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <StandardForm onSubmit={handleSubmit} className="border-none shadow-none rounded-none p-0">
      <div className="space-y-6">
        <FormField label="백업 작업명" required>
          <input
            type="text"
            value={formData.backupOpertNm || ''}
            onChange={(e) => setFormData({ ...formData, backupOpertNm: e.target.value })}
            placeholder="예: 일일 데이터베이스 전체 백업"
            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="원본 디렉토리" required>
            <input
              type="text"
              value={formData.backupOrginlDrctry || ''}
              onChange={(e) => setFormData({ ...formData, backupOrginlDrctry: e.target.value })}
              placeholder="/var/lib/mysql"
              className="w-full h-10 px-3 rounded-md border bg-background font-mono outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </FormField>
          <FormField label="저장 디렉토리" required>
            <input
              type="text"
              value={formData.backupStreDrctry || ''}
              onChange={(e) => setFormData({ ...formData, backupStreDrctry: e.target.value })}
              placeholder="/mnt/backup/mysql"
              className="w-full h-10 px-3 rounded-md border bg-background font-mono outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-y py-6 bg-muted/5 px-4 rounded-xl">
          <FormField label="실행 주기" required>
            <select
              value={formData.executCycle}
              onChange={(e) => setFormData({ ...formData, executCycle: e.target.value })}
              className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="01">매일 (Daily)</option>
              <option value="02">매주 (Weekly)</option>
              <option value="03">매월 (Monthly)</option>
              <option value="04">한번만 (Once)</option>
            </select>
          </FormField>
          <FormField label="실행 시간" required>
            <div className="flex items-center gap-2">
              <select
                value={formData.executSchdulHour}
                onChange={(e) => setFormData({ ...formData, executSchdulHour: e.target.value })}
                className="flex-1 h-10 px-2 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
                  <option key={h} value={h}>{h}시</option>
                ))}
              </select>
              <span className="text-muted-foreground">:</span>
              <select
                value={formData.executSchdulMnt}
                onChange={(e) => setFormData({ ...formData, executSchdulMnt: e.target.value })}
                className="flex-1 h-10 px-2 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                  <option key={m} value={m}>{m}분</option>
                ))}
              </select>
            </div>
          </FormField>
          <FormField label="압축 구분" required>
            <select
              value={formData.cmprsSe}
              onChange={(e) => setFormData({ ...formData, cmprsSe: e.target.value })}
              className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="01">압축 안함</option>
              <option value="02">ZIP 압축</option>
              <option value="03">TAR/GZ 압축</option>
            </select>
          </FormField>
        </div>

        <FormField label="활성화 여부" required>
          <select
            value={formData.useAt}
            onChange={(e) => setFormData({ ...formData, useAt: e.target.value as 'Y' | 'N' })}
            className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="Y">자동 실행 활성</option>
            <option value="N">자동 실행 중지</option>
          </select>
        </FormField>
      </div>

      <div className="flex justify-end gap-2 pt-6">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg font-bold">취소</button>
        <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90 transition-all">
          정책 저장하기
        </button>
      </div>
    </StandardForm>
  );
}