'use client';

import React, { useState, useEffect } from 'react';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { NetworkInfo } from '@/services/foundation/system/networkService';

interface NetworkFormProps {
 initialData?: Partial<NetworkInfo>;
 onSubmit: (data: Partial<NetworkInfo>) => Promise<void>;
 onCancel: () => void;
}

export function NetworkForm({ initialData, onSubmit, onCancel }: NetworkFormProps) {
 const [formData, setFormData] = useState<Partial<NetworkInfo>>({
 manageIem: '',
 ntwrkIp: '',
 subnet: '',
 gtwy: '',
 domnServer: '',
 userNm: '',
 useAt: 'Y',
 ...initialData
 });

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 await onSubmit(formData);
 };

 return (
 <StandardForm onSubmit={handleSubmit} className="border-none shadow-none rounded-none p-0">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <FormField label="관리 항목" required>
 <input
 type="text"
 value={formData.manageIem || ''}
 onChange={(e) => setFormData({ ...formData, manageIem: e.target.value })}
 placeholder="예: 내부망 서버실"
 className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
 required
 />
 </FormField>
 <FormField label="사용자/관리자" required>
 <input
 type="text"
 value={formData.userNm || ''}
 onChange={(e) => setFormData({ ...formData, userNm: e.target.value })}
 placeholder="관리자 성명"
 className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
 required
 />
 </FormField>
 <FormField label="IP 주소" required>
 <input
 type="text"
 value={formData.ntwrkIp || ''}
 onChange={(e) => setFormData({ ...formData, ntwrkIp: e.target.value })}
 placeholder="192.168.0.1"
 className="w-full h-10 px-3 rounded-md border bg-background font-mono outline-none focus:ring-2 focus:ring-primary/20"
 required
 />
 </FormField>
 <FormField label="서브넷 마스크" required>
 <input
 type="text"
 value={formData.subnet || ''}
 onChange={(e) => setFormData({ ...formData, subnet: e.target.value })}
 placeholder="255.255.255.0"
 className="w-full h-10 px-3 rounded-md border bg-background font-mono outline-none focus:ring-2 focus:ring-primary/20"
 required
 />
 </FormField>
 <FormField label="게이트웨이" required>
 <input
 type="text"
 value={formData.gtwy || ''}
 onChange={(e) => setFormData({ ...formData, gtwy: e.target.value })}
 placeholder="192.168.0.254"
 className="w-full h-10 px-3 rounded-md border bg-background font-mono outline-none focus:ring-2 focus:ring-primary/20"
 required
 />
 </FormField>
 <FormField label="DNS 서버">
 <input
 type="text"
 value={formData.domnServer || ''}
 onChange={(e) => setFormData({ ...formData, domnServer: e.target.value })}
 placeholder="8.8.8.8"
 className="w-full h-10 px-3 rounded-md border bg-background font-mono outline-none focus:ring-2 focus:ring-primary/20"
 />
 </FormField>
 </div>
 <FormField label="사용 여부" required>
 <select
 value={formData.useAt}
 onChange={(e) => setFormData({ ...formData, useAt: e.target.value as 'Y' | 'N' })}
 className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
 >
 <option value="Y">사용 중</option>
 <option value="N">미사용/중지</option>
 </select>
 </FormField>

 <div className="flex justify-end gap-2 pt-4">
 <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg font-bold">취소</button>
 <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90 transition-all">
 저장하기
 </button>
 </div>
 </StandardForm>
 );
}
