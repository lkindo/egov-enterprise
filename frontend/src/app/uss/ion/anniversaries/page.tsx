'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { anniversaryUserService, Anniversary } from '@/services/user/anniversary/AnniversaryUserService';
import { useToast } from '@/app/components/ui/toast';
import { Cake, Heart, Gift, Star, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnniversaryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Anniversary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await anniversaryUserService.getAnniversaries();
        setItems(res?.content || []);
      } catch (error) {
        toast('기념일 정보를 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const getIcon = (se: string) => {
    switch (se) {
      case '1': return <Cake className="text-pink-500" size={24} />;
      case '2': return <Heart className="text-red-500" size={24} />;
      case '3': return <Gift className="text-blue-500" size={24} />;
      default: return <Star className="text-yellow-500" size={24} />;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="임직원 경조사 및 기념일"
        breadcrumbs={[{ label: '부가서비스' }, { label: '기념일관리' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          [1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-2xl" />)
        ) : items.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground italic">이달의 기념일이 없습니다.</div>
        ) : (
          items.map((item) => (
            <div key={item.annId} className="bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
              <div className="p-4 bg-muted/50 rounded-2xl mb-4">
                {getIcon(item.annvrsrySe)}
              </div>
              <h3 className="font-black text-foreground">{item.userNm} 님</h3>
              <p className="text-xs text-primary font-bold mt-1">{item.annvrsryNm}</p>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-black text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                <Calendar size={12} />
                {item.annvrsryDe}
              </div>
              <p className="mt-4 text-xs text-muted-foreground line-clamp-2">
                {item.memo || "축하의 메시지를 전해보세요!"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}