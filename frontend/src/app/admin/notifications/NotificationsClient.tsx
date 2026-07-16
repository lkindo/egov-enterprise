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

export default function NotificationsClient() {
  const [view, setView] = useState<'hub' | 'dispatch'>('hub');

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <PageHeader
        title="스마트 알림 및 메시징 허브"
        breadcrumbs={[{ label: '시스템 관리' }, { label: '메시징 센터' }]}
        actions={
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-lg h-11 px-6 border-2 gap-2 font-bold hover:text-primary hover:bg-primary/5 transition-all">
              <BarChart3 size={18} /> 분석 리포트
            </Button>
            <Button variant="outline" className="rounded-lg h-11 px-6 border-2 gap-2 font-bold hover:text-primary hover:bg-primary/5 transition-all">
              <Settings size={18} /> 채널 설정
            </Button>
            <Button
              onClick={() => setView(view === 'hub' ? 'dispatch' : 'hub')}
              className={cn(
                "rounded-lg h-11 px-8 shadow-xl gap-2 font-bold transition-all",
                view === 'hub' ? "bg-primary shadow-primary/20" : "bg-slate-900 shadow-slate-900/20"
              )}
            >
              {view === 'hub' ? <Send size={18} /> : <Zap size={18} />}
              {view === 'hub' ? "메시지 발송하기" : "실시간 스트림 보기"}
            </Button>
          </div>
        }
      />

      <div className="p-10 rounded-lg bg-gradient-to-br from-indigo-900 via-slate-900 to-primary text-white relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000 rotate-12">
          <Bell size={260} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <ShieldCheck size={20} />
              <span className="text-sm font-bold tracking-[0.3em] leading-none">보안 검증 채널</span>
            </div>
            <h3 className="text-3xl font-bold tracking-tighter leading-none">
              {view === 'hub' ? "Unified Notification Intelligence" : "Next-Gen AI Message Dispatcher"}
            </h3>
            <p className="text-sm text-slate-300 font-medium max-w-xl leading-relaxed">
              {view === 'hub'
                ? "시스템 전체의 알림 흐름을 실시간으로 모니터링하고 성공률을 분석합니다. 다중 채널을 통한 메시지 전달 무결성을 100% 보장합니다."
                : "AI 콘텐츠 엔진이 탑재된 디스패처를 통해 효과적인 공지 메시지를 작성하세요. 대상자 세분화 및 발송 예약 기능으로 도달율을 극대화합니다."}
            </p>
          </div>

          <div className="flex flex-col gap-3 min-w-[200px]">
            <div className="px-6 py-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md flex items-center justify-between">
              <span className="text-xs font-bold tracking-tight opacity-50">글로벌 배포</span>
              <span className="text-xl font-bold text-emerald-400">99.9%</span>
            </div>
            <div className="px-6 py-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md flex items-center justify-between">
              <span className="text-xs font-bold tracking-tight opacity-50">활성 트리거</span>
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
                { title: 'Email Templates', icon: <Mail className="text-blue-500" />, desc: '전문적인 비즈니스 이메일 템플릿 라이브러리' },
                { title: 'SMS Quick-Replies', icon: <MessageSquare className="text-emerald-500" />, desc: '가장 많이 사용되는 SMS 단축 문구 및 예약' },
                { title: 'AI Assistant', icon: <Sparkles className="text-indigo-500" />, desc: '맞춤형 메시지 톤앤매너 및 콘텐츠 자동 교정' },
              ].map((card, i) => (
                <div key={i} className="p-8 bg-card border-2 border-primary/5 rounded-lg shadow-xl group hover:border-primary/20 transition-all cursor-pointer">
                  <div className="w-16 h-11 rounded-lg bg-muted border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
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
