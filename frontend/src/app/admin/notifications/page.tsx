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
 title="?¤ë§ˆ???Œë¦¼ ë°?ë©”ì‹œì§??ˆë¸Œ"
 breadcrumbs={[{ label: '?œìŠ¤??ê´€ë¦? }, { label: 'ë©”ì‹œì§??¼í„°' }]}
 actions={
 <div className="flex gap-3">
 <Button variant="outline" className="rounded-xl h-11 px-6 border-2 gap-2 font-bold hover:bg-primary/5 transition-all">
 <BarChart3 size={18} /> ë¶„ì„ ë¦¬í¬?? </Button>
 <Button variant="outline" className="rounded-xl h-11 px-6 border-2 gap-2 font-bold hover:bg-primary/5 transition-all">
 <Settings size={18} /> ì±„ë„ ?¤ì •
 </Button>
 <Button
 onClick={() => setView(view === 'hub' ? 'dispatch' : 'hub')}
 className={cn(
 "rounded-xl h-11 px-8 shadow-xl gap-2 font-black transition-all",
 view === 'hub' ? "bg-primary shadow-primary/20" : "bg-slate-900 shadow-slate-900/20"
 )}
 >
 {view === 'hub' ? <Send size={18} /> : <Zap size={18} />}
 {view === 'hub' ? "ë©”ì‹œì§€ ë°œì†¡?˜ê¸°" : "?¤ì‹œê°??¤íŠ¸ë¦?ë³´ê¸°"}
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
 <span className="text-sm font-black tracking-[0.3em] leading-none">ë³´ì•ˆ ê²€ì¦?ì±„ë„</span>
 </div>
 <h3 className="text-3xl font-black tracking-tighter leading-none">
 {view === 'hub' ? "Unified Notification Intelligence" : "Next-Gen AI Message Dispatcher"}
 </h3>
 <p className="text-sm text-slate-300 font-medium max-w-xl leading-relaxed">
 {view === 'hub'
 ? "?œìŠ¤???„ì²´???Œë¦¼ ?ë¦„???¤ì‹œê°„ìœ¼ë¡?ëª¨ë‹ˆ?°ë§?˜ê³  ?±ê³µë¥ ì„ ë¶„ì„?©ë‹ˆ?? ?¤ì¤‘ ì±„ë„???µí•œ ë©”ì‹œì§€ ?„ë‹¬ ë¬´ê²°?±ì„ 100% ë³´ì¥?©ë‹ˆ??"
 : "AI ì½˜í…ì¸??”ì§„???‘ì¬???”ìŠ¤?¨ì²˜ë¥??µí•´ ?¨ê³¼?ì¸ ê³µì? ë©”ì‹œì§€ë¥??‘ì„±?˜ì„¸?? ?€?ì ?¸ë¶„??ë°?ë°œì†¡ ?ˆì•½ ê¸°ëŠ¥?¼ë¡œ ?„ë‹¬?¨ì„ ê·¹ë??”í•©?ˆë‹¤."}
 </p>
 </div>

 <div className="flex flex-col gap-3 min-w-[200px]">
 <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md flex items-center justify-between">
 <span className="text-[10px] font-black tracking-tight opacity-50">ê¸€ë¡œë²Œ ë°°í¬</span>
 <span className="text-xl font-black text-emerald-400">99.9%</span>
 </div>
 <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md flex items-center justify-between">
 <span className="text-[10px] font-black tracking-tight opacity-50">?œì„± ?¸ë¦¬ê±?/span>
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
 { title: 'Email Templates', icon: <Mail className="text-blue-500" />, desc: '?„ë¬¸?ì¸ ë¹„ì¦ˆ?ˆìŠ¤???´ë©”???œí”Œë¦??¼ì´ë¸ŒëŸ¬ë¦? },
 { title: 'SMS Quick-Replies', icon: <MessageSquare className="text-emerald-500" />, desc: 'ê°€??ë§ì´ ?¬ìš©?˜ëŠ” SMS ?¨ì¶• ë¬¸êµ¬ ë°??ˆì•½' },
 { title: 'AI Assistant', icon: <Sparkles className="text-indigo-500" />, desc: 'ë§ì¶¤??ë©”ì‹œì§€ ?¤ì•¤ë§¤ë„ˆ ë°?ì½˜í…ì¸??ë™ êµì •' },
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
