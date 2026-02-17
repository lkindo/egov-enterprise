'use client';

import React, { useState } from 'react';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { EventCmpgn } from '@/services/eventCmpgnService';

interface EventCmpgnFormProps {
  initialData?: Partial<EventCmpgn>;
  onSubmit: (data: Partial<EventCmpgn>) => Promise<void>;
  onCancel: () => void;
}

export function EventCmpgnForm({ initialData, onSubmit, onCancel }: EventCmpgnFormProps) {
  const [formData, setFormData] = useState<Partial<EventCmpgn>>({
    eventNm: '',
    eventTyCode: '1',
    eventBeginDe: new Date().toISOString().split('T')[0],
    eventEndDe: new Date().toISOString().split('T')[0],
    receptBeginDe: new Date().toISOString().split('T')[0],
    receptEndDe: new Date().toISOString().split('T')[0],
    eventCn: '',
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
          <FormField label="행사/캠페인 명칭" required>
            <input 
              type="text" 
              value={formData.eventNm || ''}
              onChange={(e) => setFormData({...formData, eventNm: e.target.value})}
              placeholder="명칭 입력"
              className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </FormField>
          <FormField label="유형 구분" required>
            <select 
              value={formData.eventTyCode}
              onChange={(e) => setFormData({...formData, eventTyCode: e.target.value})}
              className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="1">행사 (Event)</option>
              <option value="2">캠페인 (Campaign)</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/20 rounded-2xl">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">행사 기간</h4>
            <div className="flex items-center gap-2">
              <input type="date" value={formData.eventBeginDe} onChange={(e) => setFormData({...formData, eventBeginDe: e.target.value})} className="flex-1 h-9 px-2 rounded border bg-background text-xs" />
              <span className="text-muted-foreground">~</span>
              <input type="date" value={formData.eventEndDe} onChange={(e) => setFormData({...formData, eventEndDe: e.target.value})} className="flex-1 h-9 px-2 rounded border bg-background text-xs" />
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">접수 기간</h4>
            <div className="flex items-center gap-2">
              <input type="date" value={formData.receptBeginDe} onChange={(e) => setFormData({...formData, receptBeginDe: e.target.value})} className="flex-1 h-9 px-2 rounded border bg-background text-xs" />
              <span className="text-muted-foreground">~</span>
              <input type="date" value={formData.receptEndDe} onChange={(e) => setFormData({...formData, receptEndDe: e.target.value})} className="flex-1 h-9 px-2 rounded border bg-background text-xs" />
            </div>
          </div>
        </div>

        <FormField label="상세 내용" required>
          <textarea 
            value={formData.eventCn || ''}
            onChange={(e) => setFormData({...formData, eventCn: e.target.value})}
            placeholder="행사 또는 캠페인의 상세 내용을 입력하세요."
            className="w-full min-h-[150px] p-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            required
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
