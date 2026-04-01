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
 title="?ㅻ쭏님?뚮┝ 諛?硫붿떆吏님덈툕"
 breadcrumbs={[{ label: '?쒖뒪님愿由? }, { label: '硫붿떆吏님쇳꽣' }]}
 actions={
 <div className="flex gap-3">
 <Button variant="outline" className="rounded-xl h-11 px-6 border-2 gap-2 font-bold hover:bg-primary/5 transition-all">
 <BarChart3 size={18} /> 분석 由ы룷님 </Button>
 <Button variant="outline" className="rounded-xl h-11 px-6 border-2 gap-2 font-bold hover:bg-primary/5 transition-all">
 <Settings size={18} /> 梨꾨꼸 ?ㅼ젙
 </Button>
 <Button
 onClick={() => setView(view === 'hub' ? 'dispatch' : 'hub')}
 className={cn(
 "rounded-xl h-11 px-8 shadow-xl gap-2 font-black transition-all",
 view === 'hub' ? "bg-primary shadow-primary/20" : "bg-slate-900 shadow-slate-900/20"
 )}
 >
 {view === 'hub' ? <Send size={18} /> : <Zap size={18} />}
 {view === 'hub' ? "硫붿떆吏 諛쒖넚?섍린" : "?ㅼ떆媛님ㅽ듃由?蹂닿린"}
 </Button>
 </div>
 }
 />

 {/* Hero Intelligence Banner */}
 <div className="p-10 rounded-[3.5rem] bg-gradient-to-br from-indigo-900 via-slate-900 to-primary text-white relative overflow-hidden group shadow-2xl">
 <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000 rotate-12">
 <Bell size={260} />
 </div>
 <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
 <div className="space-y-4">
 <div className="flex items-center gap-3 text-emerald-400">
 <ShieldCheck size={20} />
 <span className="text-sm font-black tracking-[0.3em] leading-none">보안 寃利?梨꾨꼸</span>
 </div>
 <h3 className="text-3xl font-black tracking-tighter leading-none">
 {view === 'hub' ? "Unified Notification Intelligence" : "Next-Gen AI Message Dispatcher"}
 </h3>
 <p className="text-sm text-slate-300 font-medium max-w-xl leading-relaxed">
 {view === 'hub'
 ? "?쒖뒪님?꾩껜님?뚮┝ ?먮쫫님?ㅼ떆媛꾩쑝濡?紐⑤땲?곕쭅?섍퀬 ?깃났瑜좎쓣 분석?⑸땲님 ?ㅼ쨷 梨꾨꼸님?듯븳 硫붿떆吏 ?꾨떖 臾닿껐?깆쓣 100% 蹂댁옣?⑸땲님"
 : "AI 肄섑뀗痢님붿쭊님?묒옱님?붿뒪?⑥쿂瑜님듯빐 ?④낵?곸씤 怨듭? 硫붿떆吏瑜님묒꽦?섏꽭님 ??곸옄 ?몃텇님諛?諛쒖넚 ?덉빟 湲곕뒫?쇰줈 ?꾨떖?⑥쓣 洹밸님뷀빀?덈떎."}
 </p>
 </div>

 <div className="flex flex-col gap-3 min-w-[200px]">
 <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md flex items-center justify-between">
 <span className="text-[10px] font-black tracking-tight opacity-50">湲濡쒕쾶 諛고룷</span>
 <span className="text-xl font-black text-emerald-400">99.9%</span>
 </div>
 <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md flex items-center justify-between">
 <span className="text-[10px] font-black tracking-tight opacity-50">활성 ?몃━嫄?/span>
 <span className="text-xl font-black text-indigo-400">2,412</span>
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

 {/* Dispatch Help Grid */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
 {[
 { title: 'Email Templates', icon: <Mail className="text-blue-500" />, desc: '?꾨Ц?곸씤 鍮꾩쫰?덉뒪님?대찓님?쒗뵆由님쇱씠釉뚮윭由? },
 { title: 'SMS Quick-Replies', icon: <MessageSquare className="text-emerald-500" />, desc: '媛님留롮씠 ?ъ슜?섎뒗 SMS ?⑥텞 臾멸뎄 諛님덉빟' },
 { title: 'AI Assistant', icon: <Sparkles className="text-indigo-500" />, desc: '留욎땄님硫붿떆吏 ?ㅼ븻留ㅻ꼫 諛?肄섑뀗痢님먮룞 援먯젙' },
 ].map((card, i) => (
 <div key={i} className="p-8 bg-card border-2 border-primary/5 rounded-[3rem] shadow-xl group hover:border-primary/20 transition-all cursor-pointer">
 <div className="w-16 h-16 rounded-2xl bg-slate-50 border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
 {card.icon}
 </div>
 <h4 className="text-xl font-black tracking-tight mb-2">{card.title}</h4>
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

