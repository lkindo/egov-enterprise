'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { SmartNotificationHub } from '@/app/components/ui/smart-notification-hub';
import { NotificationSender } from '@/app/components/ui/notification-sender';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Send,
  Settings,
  BarChart3,
  Zap,
  ShieldCheck,
  Mail,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const [view, setView] = useState<'hub' | 'dispatch'>('hub');

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <PageHeader
        title="?�마???�림 �?메시�??�브"
        breadcrumbs={[{ label: '?�스??관�? }, { label: '메시�??�터' }]}
        actions={
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-lg h-11 px-6 border-2 gap-2 font-bold hover:bg-primary/5 transition-all">
              <BarChart3 size={18} /> 분석 리포??            </Button>
            <Button variant="outline" className="rounded-lg h-11 px-6 border-2 gap-2 font-bold hover:bg-primary/5 transition-all">
              <Settings size={18} /> 채널 ?�정
            </Button>
            <Button
              onClick={() => setView(view === 'hub' ? 'dispatch' : 'hub')}
              className={cn(
                "rounded-lg h-11 px-8 shadow-xl gap-2 font-bold transition-all",
                view === 'hub' ? "bg-primary shadow-primary/20" : "bg-slate-900 shadow-slate-900/20"
              )}
            >
              {view === 'hub' ? <Send size={18} /> : <Zap size={18} />}
              {view === 'hub' ? "메시지 발송?�기" : "?�시�??�트�?보기"}
            </Button>
          </div>
        }
      />

      <div className="p-8 rounded-lg bg-gradient-to-br from-indigo-900 via-slate-900 to-primary text-white relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000 rotate-12">
          <Bell size={260} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <ShieldCheck size={20} />
              <span className="text-xs font-bold tracking-widest leading-none">보안 검�?채널</span>
            </div>
            <h3 className="text-3xl font-bold tracking-tight leading-none">
              {view === 'hub' ? "Unified Notification Intelligence" : "Next-Gen AI Message Dispatcher"}
            </h3>
            <p className="text-sm text-slate-300 font-medium max-w-xl leading-relaxed">
              {view === 'hub'
                ? "?�스???�체???�림 ?�름???�시간으�?모니?�링?�고 ?�공률을 분석?�니?? ?�중 채널???�한 메시지 ?�달 무결?�을 100% 보장?�니??"
                : "AI 콘텐�??�진???�재???�스?�처�??�해 ?�과?�인 공�? 메시지�??�성?�세?? ?�?�자 ?�분??�?발송 ?�약 기능?�로 ?�달?�을 극�??�합?�다."}
            </p>
          </div>

          <div className="flex flex-col gap-3 min-w-[200px]">
            <div className="px-6 py-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md flex items-center justify-between">
              <span className="text-xs font-bold tracking-tight opacity-50">글로벌 배포</span>
              <span className="text-xl font-bold text-emerald-400">99.9%</span>
            </div>
            <div className="px-6 py-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md flex items-center justify-between">
              <span className="text-xs font-bold tracking-tight opacity-50">?�성 ?�리�?/span>
              <span className="text-xl font-bold text-indigo-400">2,412</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        {view === 'hub' ? (
          <SmartNotificationHub />
        ) : (
          <div className="animate-in zoom-in-95 duration-700">
            <NotificationSender />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              {[
                { title: 'Email Templates', icon: <Mail className="text-blue-500" />, desc: '?�문?�인 비즈?�스 ?�메???�플�??�이브러�? },
                { title: 'SMS Quick-Replies', icon: <MessageSquare className="text-emerald-500" />, desc: '가??많이 ?�용?�는 SMS ?�축 문구 �??�약' },
                { title: 'AI Assistant', icon: <Sparkles className="text-indigo-500" />, desc: '맞춤??메시지 ?�앤매너 �?콘텐�??�동 교정' },
              ].map((card, i) => (
                <div key={i} className="p-8 bg-card border-2 border-primary/5 rounded-lg shadow-xl group hover:border-primary/20 transition-all cursor-pointer">
                  <div className="w-16 h-12 rounded-lg bg-slate-50 border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {card.icon}
                  </div>
                  <h4 className="text-xl font-bold tracking-tight mb-2">{card.title}</h4>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
