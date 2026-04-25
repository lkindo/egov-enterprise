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
      } catch (error) {
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
    } catch (error) {
      toast('상태 변경 중 오류가 발생했습니다.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-1000">
      <PageHeader
        title="마이페이지 설정"
        breadcrumbs={[{ label: '워크스페이스' }, { label: '마이페이지 설정' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        {loading ? (
          Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-xl" />
            ))
        ) : contents.length > 0 ? (
          contents.map((item) => (
            <div
              key={item.cntntsId}
              className={`p-10 bg-white border-2 rounded-xl shadow-sm hover:shadow-2xl transition-all duration-500 group ${
                item.cntntsUseAt === 'Y' ? 'border-primary/20' : 'opacity-60 grayscale border-slate-100'
              }`}
            >
              <div className="flex justify-between items-start mb-8">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-500 ${
                  item.cntntsUseAt === 'Y' ? 'bg-primary/10 text-primary group-hover:scale-110' : 'bg-slate-100 text-slate-400'
                }`}>
                  <LayoutGrid size={32} />
                </div>
                <button
                  onClick={() => toggleStatus(item)}
                  className={`w-12 h-12 rounded-xl transition-all duration-300 flex items-center justify-center ${
                    item.cntntsUseAt === 'Y' ? 'text-emerald-500 bg-emerald-50 hover:bg-emerald-500 hover:text-white shadow-emerald-500/10' : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {item.cntntsUseAt === 'Y' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                </button>
              </div>
              <h3 className="text-xl font-black text-foreground tracking-tighter uppercase leading-tight">{item.cntntsNm}</h3>
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2 font-bold tracking-tight opacity-70">{item.cntntsDc || '설명이 정의되지 않은 컴포넌트입니다.'}</p>
              <div className="mt-8 pt-8 border-t border-slate-50 flex items-center gap-3 overflow-hidden">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span className="text-[10px] font-black font-mono text-slate-400 tracking-widest truncate">{item.cntcUrl}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 text-center bg-slate-50 rounded-xl border-4 border-dashed border-slate-200 flex flex-col items-center gap-6">
            <LayoutGrid size={64} className="text-slate-200" />
            <p className="text-slate-400 font-black tracking-widest uppercase text-xs">등록된 마이페이지 콘텐츠가 현재 클러스터에 존재하지 않습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
