'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { myPageAdminService } from '@/services/foundation/workspace/MyPageAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Settings, CheckCircle2, XCircle, LayoutGrid } from 'lucide-react';

export default function MyPageManagement() {
 const [contents, setContents] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const { toast } = useToast();

 useEffect(() => {
 async function load() {
 try {
 const data = await myPageAdminService.getContents({ all: true });
 setContents(data);
 } catch {
 toast('콘텐츠 정보를 불러오지 못했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 }
 load();
 }, [toast]);

 const toggleStatus = async (item: any) => {
 const newStatus = item.cntntsUseAt === 'Y' ? 'N' : 'Y';
 try {
 await myPageAdminService.updateContent(item.cntntsId, { ...item, cntntsUseAt: newStatus });
 setContents(contents.map(c => c.cntntsId === item.cntntsId ? { ...c, cntntsUseAt: newStatus } : c));
 toast(`${item.cntntsNm} 상태가 변경되었습니다.`);
 } catch {
 toast('상태 변경 중 오류가 발생했습니다.', 'error');
 }
 };

 return (
 <div className="space-y-6">
 <PageHeader
 title="마이페이지 설정"
 breadcrumbs={[{ label: '워크스페이스' }, { label: '마이페이지 설정' }]}
 />

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {loading ? (
 Array(6)
 .fill(0)
 .map((_, i) => (
 <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
 ))
 ) : contents.length > 0 ? (
 contents.map((item) => (
 <div
 key={item.cntntsId}
 className={`p-6 bg-white border rounded-3xl shadow-sm hover:shadow-md transition-all ${
 item.cntntsUseAt === 'Y' ? 'border-primary/20' : 'opacity-60 grayscale'
 }`}
 >
 <div className="flex justify-between items-start mb-4">
 <div className={`p-3 rounded-2xl ${item.cntntsUseAt === 'Y' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
 <LayoutGrid size={24} />
 </div>
 <button
 onClick={() => toggleStatus(item)}
 className={`p-2 rounded-xl transition-colors ${
 item.cntntsUseAt === 'Y' ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'
 }`}
 >
 {item.cntntsUseAt === 'Y' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
 </button>
 </div>
 <h3 className="text-lg font-bold text-foreground">{item.cntntsNm}</h3>
 <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.cntntsDc || '설명이 없습니다.'}</p>
 <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-50 p-2 rounded-lg">
 <span>{item.cntcUrl}</span>
 </div>
 </div>
 ))
 ) : (
 <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
 <p className="text-slate-400">등록된 마이페이지 콘텐츠가 없습니다.</p>
 </div>
 )}
 </div>
 </div>
 );
}
