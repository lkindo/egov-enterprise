'use client';

import React, { useState } from 'react';
import {
 Bell,
 Mail,
 MessageSquare,
 Send,
 Search,
 Filter,
 Clock,
 CheckCircle2,
 AlertTriangle,
 Info,
 MoreVertical,
 ChevronRight,
 Zap,
 Bot
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NotificationRecord {
 id: string;
 type: 'system' | 'mail' | 'sms';
 title: string;
 content: string;
 recipient: string;
 timestamp: string;
 status: 'sent' | 'pending' | 'failed';
 severity: 'low' | 'medium' | 'high';
}

export function SmartNotificationHub() {
 const [activeTab, setActiveTab] = useState<'all' | 'system' | 'mail' | 'sms'>('all');
 const [search, setSearch] = useState('');

 const MOCK_NOTIFICATIONS: NotificationRecord[] = [
 {
 id: 'nt-001',
 type: 'system',
 title: '보안 ?뺤콉 蹂寃님덈궡',
 content: '?⑥뒪?뚮뱶 留뚮즺 二쇨린 ?뺤콉님30?쇰줈 ?⑥텞?섏뿀?듬땲님',
 recipient: '?꾩껜 ?ъ슜님,
 timestamp: '2026-02-23 10:30:15',
 status: 'sent',
 severity: 'high'
 },
 {
 id: 'nt-002',
 type: 'mail',
 title: '?곌컙 ?깃낵 분석 蹂닿퀬님,
 content: '2025?꾨룄 ?깃낵 분석 寃곌낵 由ы룷?멸? 諛쒖넚?섏뿀?듬땲님',
 recipient: 'executives@company.com',
 timestamp: '2026-02-23 09:15:00',
 status: 'pending',
 severity: 'medium'
 },
 {
 id: 'nt-003',
 type: 'sms',
 title: '?쒕쾭 怨쇰님?寃쎄퀬',
 content: '[EGov] DB ?쒕쾭 CPU ?먯쑀님95% 珥덇낵 諛쒖깮',
 recipient: '010-XXXX-XXXX',
 timestamp: '2026-02-23 08:45:22',
 status: 'failed',
 severity: 'high'
 },
 {
 id: 'nt-004',
 type: 'system',
 title: '신규 ?낅뜲?댄듃 ?꾨즺',
 content: '?뚮옯님v2.4.0 ?⑥튂媛 ?깃났?곸쑝濡님곸슜?섏뿀?듬땲님',
 recipient: 'Admin.Lee',
 timestamp: '2026-02-22 23:00:00',
 status: 'sent',
 severity: 'low'
 }
 ];

 const getStatusIcon = (status: string) => {
 switch (status) {
 case 'sent': return <CheckCircle2 className="text-emerald-500" size={14} />;
 case 'pending': return <Clock className="text-amber-500 animate-pulse" size={14} />;
 case 'failed': return <AlertTriangle className="text-rose-500" size={14} />;
 default: return <Info className="text-blue-500" size={14} />;
 }
 };

 const getSeverityStyle = (severity: string) => {
 switch (severity) {
 case 'high': return "bg-rose-500 text-white";
 case 'medium': return "bg-amber-500 text-white";
 default: return "bg-slate-200 text-slate-700";
 }
 };

 const filteredLogs = MOCK_NOTIFICATIONS.filter(log => {
 const matchTab = activeTab === 'all' || log.type === activeTab;
 const matchSearch = log.title.toLowerCase().includes(search.toLowerCase()) || log.content.toLowerCase().includes(search.toLowerCase());
 return matchTab && matchSearch;
 });

 return (
 <div className="flex flex-col gap-8 animate-in fade-in duration-700">
 {/* Dynamic Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 {[
 { label: '?꾩껜 ?뚮┝', count: 1284, delta: '+12%', icon: <Bell />, color: 'primary' },
 { label: '?쒖뒪님怨듭?', count: 42, delta: '+2', icon: <Bot />, color: 'indigo' },
 { label: '硫붿씪 諛쒖넚', count: 856, delta: '+45', icon: <Mail />, color: 'blue' },
 { label: 'SMS ?꾩넚', count: 386, delta: '-5%', icon: <MessageSquare />, color: 'emerald' },
 ].map((stat, i) => (
 <div key={`hub-stat-${i}`} className="p-8 pb-6 bg-card border-2 border-primary/5 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 bg-muted rounded-2xl text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all duration-500">
 {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 20 })}
 </div>
 <span className={cn(
 "text-[10px] font-black px-2 py-0.5 rounded-lg",
 stat.delta.startsWith('+') ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
 )}>{stat.delta}</span>
 </div>
 <h4 className="text-[10px] font-black text-muted-foreground tracking-tight leading-none mb-2">{stat.label}</h4>
 <p className="text-3xl font-black tracking-tighter">{stat.count.toLocaleString()}</p>
 <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
 </div>
 ))}
 </div>

 <div className="flex flex-col xl:flex-row gap-8">
 {/* Center: Live Stream & Control */}
 <div className="flex-1 flex flex-col gap-8">
 <div className="p-10 bg-card border-2 border-primary/5 rounded-[3.5rem] shadow-2xl space-y-8">
 <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-primary/5">
 <div className="flex items-center gap-4">
 <div className="p-4 bg-primary/10 rounded-2xl text-primary relative">
 <Zap size={24} className="animate-pulse" />
 <div className="absolute top-0 right-0 w-3 h-3 bg-rose-500 border-2 border-white rounded-full" />
 </div>
 <div>
   <h2 className="text-xl font-black tracking-tighter ">?ㅼ떆媛님뚮┝ ?ㅽ듃由?/h2>
 <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-muted-foreground opacity-50 tracking-tight">
   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 梨꾨꼸 臾닿껐님 理쒖쟻?붾맖
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <div className="flex bg-muted/40 p-1.5 rounded-2xl border-2 border-primary/5">
 {['all', 'system', 'mail', 'sms'].map(tab => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab as any)}
 className={cn(
 "px-4 py-2 rounded-xl text-[10px] font-black tracking-tight transition-all",
 activeTab === tab ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-primary/5"
 )}
 >{tab}</button>
 ))}
 </div>
 <div className="relative w-48 hidden md:block">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={14} />
 <input
 className="w-full bg-muted/20 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-primary/10 transition-all"
   placeholder="寃님諛님꾪꽣留?.."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 </div>
 </div>

 <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
 {filteredLogs.map((log, i) => (
 <div key={log.id || `hub-log-${i}`} className="group flex items-center gap-6 p-6 rounded-[2.5rem] bg-muted/10 border-2 border-transparent hover:bg-card hover:border-primary/10 hover:shadow-xl transition-all duration-500 animate-in fade-in slide-in-from-right-4" style={{ animationDelay: `${i * 100}ms` }}>
 <div className={cn(
 "w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform duration-500",
 log.type === 'system' ? "bg-indigo-500/10 text-indigo-500" : log.type === 'mail' ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"
 )}>
 {log.type === 'system' ? <Bot size={24} /> : log.type === 'mail' ? <Mail size={24} /> : <MessageSquare size={24} />}
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-3 mb-1">
 <h3 className="text-sm font-black text-foreground truncate">{log.title}</h3>
 <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full tracking-tight", getSeverityStyle(log.severity))}>
 {log.severity}
 </span>
 </div>
 <p className="text-sm font-bold text-muted-foreground/60 leading-relaxed truncate">{log.content}</p>
 <div className="flex items-center gap-4 mt-2">
 <span className="text-[10px] font-black text-primary tracking-tight flex items-center gap-1.5 opacity-60">
 <Send size={10} /> {log.recipient}
 </span>
 <span className="text-[10px] font-bold text-muted-foreground/30 flex items-center gap-1.5">
 <Clock size={10} /> {log.timestamp}
 </span>
 </div>
 </div>

 <div className="flex flex-col items-center gap-2">
 <div className="p-2 bg-background rounded-full border shadow-sm group-hover:rotate-12 transition-transform">
 {getStatusIcon(log.status)}
 </div>
   <span className="text-[9px] font-black text-muted-foreground opacity-40">{log.status === 'sent' ? '諛쒖넚?꾨즺' : log.status === 'pending' ? '?湲곗쨷' : '?ㅽ뙣'}</span>
 </div>

 <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical size={16} /></Button>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Right: Quick Action & Rules */}
 <div className="w-full xl:w-96 flex flex-col gap-8">
 <div className="p-8 bg-gradient-to-br from-primary to-blue-600 border-none rounded-[3.5rem] text-white shadow-2xl shadow-primary/30 relative overflow-hidden group flex flex-col justify-center h-80">
 <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-3xl animate-pulse" />
 <div className="relative z-10 flex flex-col items-center text-center space-y-4">
 <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform duration-700">
 <Zap size={40} className="text-white fill-white" />
 </div>
 <div>
   <h3 className="text-2xl font-black tracking-tighter">AI ?ㅻ쭏님諛곕떖</h3>
 <p className="text-sm font-bold opacity-80 mt-2 leading-relaxed">?섏떊?먯쓽 업무 ?⑦꽩님분석?섏뿬<br />理쒖쟻님?쒓컙님?뚮┝님諛곕떖?⑸땲님</p>
 </div>
 <Button className="w-full bg-white text-primary hover:bg-white/90 rounded-2xl h-14 font-black shadow-xl">諛쒖넚 理쒖쟻님?붿쭊 활성</Button>
 </div>
 </div>

 <div className="p-10 bg-card border-2 border-primary/5 rounded-[3.5rem] shadow-xl space-y-8 flex-1">
 <div>
   <h4 className="text-[10px] font-black text-primary tracking-[0.3em] mb-6">梨꾨꼸 ?곹깭 吏님/h4>
 <div className="space-y-6">
 {[
 { name: 'System Push', score: 99, color: 'primary' },
 { name: 'Email SMTP', score: 94, color: 'blue' },
 { name: 'SMS Gateway', score: 88, color: 'emerald' },
 ].map((channel, i) => (
 <div key={`channel-health-${i}`} className="space-y-2">
 <div className="flex justify-between items-end">
 <span className="text-sm font-black text-foreground">{channel.name}</span>
 <span className="text-[10px] font-black text-primary">{channel.score}%</span>
 </div>
 <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5">
 <div className={cn("h-full rounded-full animate-in slide-in-from-left duration-1000", `bg-${channel.color}`)} style={{ width: `${channel.score}%` }} />
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="pt-8 border-t border-primary/5 space-y-4">
   <h4 className="text-[10px] font-black text-muted-foreground tracking-tight opacity-50">吏?ν삎 인사이트</h4>
 <div className="p-5 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
 <Info size={16} className="text-indigo-500 mt-0.5" />
 <p className="text-[10px] font-bold text-indigo-900/60 leading-relaxed">
 ?ㅼ쟾 10?쒖뿉님11님?ъ씠님諛쒖넚님?뚮┝님?뺤씤?⑥씠 媛님?믪뒿?덈떎. 以묒슂님怨듭님님님쒓컙님?쒖슜?섏꽭님
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

