'use client';

import React, { useState } from 'react';
import {
 Send,
 Sparkles,
 Target,
 Layers,
 Mail,
 MessageSquare,
 Bell,
 X,
 Calendar,
 ShieldCheck,
 Zap,
 Bot,
 UserCheck,
 Users
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function NotificationSender() {
 const [channel, setChannel] = useState<'system' | 'mail' | 'sms'>('system');
 const [isGenerating, setIsGenerating] = useState(false);
 const [message, setMessage] = useState('');

 const simulateAIGenerate = () => {
 setIsGenerating(true);
 setTimeout(() => {
 setMessage("[?Œë¦¼] ?œìŠ¤??? ì?ë³´ìˆ˜ ?ˆë‚´\n?í™œ???œë¹„???œê³µ???„í•´ ?„ë˜?€ ê°™ì´ ?•ê¸° ?ê???ì§„í–‰???ˆì •?…ë‹ˆ??\n\n- ?¼ì‹œ: 2026??2??28??01:00 ~ 05:00\n- ?í–¥: ?ê? ?œê°„ ??ëª¨ë“  ?œë¹„???¼ì‹œ ì¤‘ë‹¨\n\nì¤‘ìš”???°ì´?°ëŠ” ë¯¸ë¦¬ ?€?¥í•´ ì£¼ì‹œê¸?ë°”ë?ˆë‹¤.");
 setIsGenerating(false);
 }, 1500);
 };

 return (
 <div className="bg-card border-2 border-primary/10 rounded-[4rem] p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative overflow-hidden group/sender">
 {/* Decorative Grid Background */}
 <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]" />

 <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16">
 {/* Left: Configuration */}
 <div className="space-y-10">
 <div>
 <div className="flex items-center gap-3 mb-4">
 <div className="p-3 bg-primary rounded-2xl text-white shadow-xl shadow-primary/30">
 <Target size={24} />
 </div>
 <h2 className="text-3xl font-black tracking-tighter ">ë°œì†¡ ?œì–´ ?¼í„°</h2>
 </div>
 <p className="text-sm font-bold text-muted-foreground opacity-60 leading-relaxed max-w-sm">
 ?€?ì?ê²Œ ìµœì ??ì±„ë„???µí•´ ì¤‘ìš”??ë©”ì‹œì§€ë¥??„ë‹¬?©ë‹ˆ?? AI ?”ì§„??ë¬¸ë§¥??ë§ëŠ” ?¤ì•¤ë§¤ë„ˆë¥?ì¶”ì²œ?©ë‹ˆ??
 </p>
 </div>

 <div className="space-y-6">
 <label className="text-[10px] font-black text-primary tracking-[0.3em] ml-2">ë°œì†¡ ì±„ë„ ? íƒ</label>
 <div className="grid grid-cols-3 gap-4">
 {[
 { id: 'system', icon: <Bell />, label: '?œìŠ¤?? },
 { id: 'mail', icon: <Mail />, label: '?´ë©”?? },
 { id: 'sms', icon: <MessageSquare />, label: 'SMS' },
 ].map(item => (
 <button
 key={item.id}
 onClick={() => setChannel(item.id as any)}
 className={cn(
 "p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-3 group/item",
 channel === item.id ? "bg-primary text-white border-primary shadow-2xl shadow-primary/20 scale-[1.05]" : "bg-card border-transparent hover:border-primary/20 hover:bg-primary/5 text-muted-foreground"
 )}
 >
 <div className={cn(
 "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
 channel === item.id ? "bg-white/20 rotate-12" : "bg-muted group-hover/item:bg-primary/10"
 )}>
 {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
 </div>
 <span className="text-[10px] font-black tracking-tight">{item.label}</span>
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-4">
 <label className="text-[10px] font-black text-primary tracking-[0.3em] ml-2">?˜ì‹  ?€?ì ?¸ë¶„??/label>
 <div className="p-6 rounded-[2.5rem] bg-muted/40 border-2 border-dashed border-primary/10 flex items-center justify-between hover:border-primary/30 transition-colors cursor-pointer group/target">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-white border flex items-center justify-center shadow-inner group-hover/target:scale-110 transition-transform">
 <Users className="text-muted-foreground" size={20} />
 </div>
 <div>
 <p className="text-sm font-black text-foreground">?„ì²´ ?„ì§??(Active)</p>
 <p className="text-[10px] font-bold text-muted-foreground opacity-50 tracking-tight">1,204ëª…ì˜ ?˜ì‹ ???•ì¸??/p>
 </div>
 </div>
 <UserCheck className="text-primary opacity-0 group-hover/target:opacity-100 transition-opacity" size={24} />
 </div>
 </div>

 <div className="flex gap-4 pt-6">
 <div className="flex-1 p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10">
 <div className="flex items-center gap-2 text-indigo-600 mb-2">
 <ShieldCheck size={16} />
 <span className="text-[9px] font-black tracking-tight leading-none">ë¬´ê²°??ê²€ì¦??µê³¼</span>
 </div>
 <p className="text-[10px] font-bold text-indigo-900/40">??ë©”ì‹œì§€??ì¤‘ë³µ ë°œì†¡ ë°©ì? ?„í„°???˜í•´ ?ˆì „?˜ê²Œ ë³´í˜¸?˜ê³  ?ˆìŠµ?ˆë‹¤.</p>
 </div>
 </div>
 </div>

 {/* Right: Content Editor */}
 <div className="flex flex-col gap-6">
 <div className="flex-1 flex flex-col p-10 bg-card border-2 border-primary/10 rounded-[3.5rem] shadow-2xl relative group/editor">
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-primary/10 rounded-xl text-primary"><Layers size={18} /></div>
 <span className="text-sm font-black tracking-tight">ì½˜í…ì¸??¸ì§‘ê¸?/span>
 </div>
 <Button
 variant="ghost"
 onClick={simulateAIGenerate}
 disabled={isGenerating}
 className="rounded-xl h-10 px-6 gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-[10px] tracking-tight shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
 >
 {isGenerating ? <Zap size={14} className="animate-spin" /> : <Sparkles size={14} />}
 AI ì½˜í…ì¸?ì´ˆì•ˆ ?ì„±

 </Button>
 </div>

 <textarea
 className="flex-1 w-full bg-transparent border-none outline-none resize-none text-xl font-bold placeholder:text-muted-foreground/10 custom-scrollbar leading-relaxed"
 placeholder="ë©”ì‹œì§€ ?´ìš©???…ë ¥?˜ê±°??AI ?œë˜?„íŠ¸ë¥??œìš©?˜ì„¸??.."
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 />

 <div className="pt-6 border-t border-primary/5 flex items-center justify-between">
 <div className="flex gap-2">
 <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2"><Bot size={16} /></Button>
 <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2"><Calendar size={16} /></Button>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-[10px] font-black text-muted-foreground opacity-40">Words: {message.length}</span>
 <Button className="h-14 px-10 rounded-2xl font-black text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-3 group/send">
 ë©”ì‹œì§€ ?¼ê´„ ë°œì†¡ <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
 </Button>
 </div>
 </div>

 {isGenerating && (
 <div className="absolute inset-x-10 bottom-32 h-1 bg-muted rounded-full overflow-hidden p-0.5">
 <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-ai-progress" />
 </div>
 )}
 </div>

 {/* Preview Banner */}
 <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between shadow-xl">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
 <Zap size={18} className="text-yellow-400" />
 </div>
 <div>
 <p className="text-[10px] font-black tracking-tight opacity-60">ë¹„ì£¼??ë¯¸ë¦¬ë³´ê¸°</p>
 <p className="text-sm font-bold">ëª¨ë°”??? ê¸ˆ?”ë©´ ?„ì ¯ (ëª©ì—…)</p>
 </div>
 </div>
 <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
 <div className="h-full bg-yellow-400 w-2/3" />
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
