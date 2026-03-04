'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { eventUserService, Event } from '@/services/user/event/EventUserService';
import { useToast } from '@/app/components/ui/toast';
import { Calendar, MapPin, Flag, Plus, Users, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EventPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = (await eventUserService.getEvents({ page: 0, size: 12 })) as any;
        if (res?.success) setEvents(res.data.content || []);
      } catch (error) {
        toast('행사 목록을 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="전사 행사 및 캠페인"
        breadcrumbs={[{ label: '부가서비스' }, { label: '행사관리' }]}
        actions={
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
            <Plus size={18} /> 새 행사 등록
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground italic">진행 중인 행사가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <div key={evt.eventId} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group border-b-4 border-b-primary/20">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    evt.ctgryCode === '1' ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {evt.ctgryCode === '1' ? 'EVENT' : 'CAMPAIGN'}
                  </span>
                  <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-bold">
                    <Calendar size={12} /> {evt.eventBeginDe}
                  </div>
                </div>

                <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {evt.eventNm}
                </h3>

                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {evt.eventPurps}
                </p>

                <div className="pt-4 flex flex-col gap-2 border-t">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <MapPin size={14} className="text-primary" />
                    {evt.eventPlace}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Users size={14} className="text-primary" />
                    전사 임직원 대상
                  </div>
                </div>
              </div>

              <button className="w-full py-3 bg-muted/30 group-hover:bg-primary group-hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-2">
                자세히 보기 <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}