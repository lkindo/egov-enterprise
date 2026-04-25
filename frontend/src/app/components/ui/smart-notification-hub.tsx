'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Shield, 
  Zap, 
  Activity, 
  Cpu, 
  Globe, 
  Mail, 
  MessageSquare, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  Maximize2,
  RefreshCw,
  X,
  ChevronRight,
  Clock,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Notification {
  id: string;
  title: string;
  content: string;
  time: string;
  type: 'security' | 'system' | 'message' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'read' | 'archived';
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Security Protocol Alpha Activated',
    content: 'Multiple failed login attempts detected from IP: 192.168.1.104. Automated firewall rules applied.',
    time: '2 mins ago',
    type: 'security',
    priority: 'critical',
    status: 'new'
  },
  {
    id: '2',
    title: 'System Intelligence Optimized',
    content: 'AI-driven database indexing complete. Query performance improved by 24.5%.',
    time: '15 mins ago',
    type: 'system',
    priority: 'medium',
    status: 'new'
  },
  {
    id: '3',
    title: 'New Collaborative Message',
    content: 'Admin_User_01 sent a new strategy document for the upcoming Q3 infrastructure review.',
    time: '1 hour ago',
    type: 'message',
    priority: 'low',
    status: 'read'
  }
];

export function SmartNotificationHub() {
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'unread'>('all');
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState(100);

  // Auto-refresh simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) return 100;
        return prev - 0.5;
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'security': return <Lock size={16} className="text-rose-500" />;
      case 'system': return <Cpu size={16} className="text-indigo-500" />;
      case 'message': return <MessageSquare size={16} className="text-emerald-500" />;
      case 'alert': return <AlertCircle size={16} className="text-amber-500" />;
    }
  };

  const getPriorityBadge = (priority: Notification['priority']) => {
    switch (priority) {
      case 'critical': return <Badge className="bg-rose-500/10 text-rose-600 border-none rounded-lg text-[9px] font-black tracking-widest px-2">CRITICAL</Badge>;
      case 'high': return <Badge className="bg-rose-500/10 text-rose-500 border-none rounded-lg text-[9px] font-black tracking-widest px-2">HIGH</Badge>;
      case 'medium': return <Badge className="bg-indigo-500/10 text-indigo-500 border-none rounded-lg text-[9px] font-black tracking-widest px-2">MEDIUM</Badge>;
      case 'low': return <Badge className="bg-slate-100 text-slate-500 border-none rounded-lg text-[9px] font-black tracking-widest px-2">LOW</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* 🚀 Hub Scene Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200 dark:shadow-none">
                <Bell size={20} className="animate-bounce" />
             </div>
             <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Smart Notification Hub</h2>
          </div>
          <p className="text-sm font-bold text-slate-500 tracking-tight pl-1">실시간 인텔리전스 및 보안 프로토콜 통합 알림</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50">
             {['all', 'unread', 'critical'].map((tab) => (
               <Button
                 key={tab}
                 variant="ghost"
                 size="sm"
                 className={cn(
                   "h-8 rounded-lg px-4 text-[10px] font-black uppercase transition-all",
                   activeTab === tab ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-500"
                 )}
                 onClick={() => setActiveTab(tab as any)}
               >
                 {tab}
               </Button>
             ))}
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
             <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* 🧩 Intelligence Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* 📟 Active Stream (Main Bento Card) */}
        <div className="md:col-span-8 space-y-4">
          <div className="hub-bento-card border-none bg-white dark:bg-slate-900 shadow-xl p-0 h-full flex flex-col">
             <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                   <Activity size={18} className="text-primary animate-pulse" />
                   <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Live Intelligence Stream</span>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-400">NEXT_SYNC</span>
                      <Progress value={progress} className="w-20 h-1 bg-slate-200 dark:bg-slate-800" />
                   </div>
                </div>
             </div>

             <div className="flex-1 p-4 space-y-2">
                <AnimatePresence mode="popLayout">
                   {notifications.map((notif) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={cn(
                          "group p-6 rounded-xl transition-all duration-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50 relative overflow-hidden",
                          notif.status === 'new' && "bg-primary/5 border-primary/10"
                        )}
                      >
                         <div className="flex items-start gap-6">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                               {getTypeIcon(notif.type)}
                            </div>
                            <div className="flex-1 space-y-2">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <h3 className="font-black text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-primary transition-colors">
                                        {notif.title}
                                     </h3>
                                     {getPriorityBadge(notif.priority)}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-tighter">
                                     <Clock size={10} />
                                     {notif.time}
                                  </span>
                               </div>
                               <p className="text-[13px] font-bold text-slate-500 leading-relaxed max-w-2xl">
                                  {notif.content}
                                </p>
                                <div className="pt-2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[9px] font-black px-3 hover:bg-primary hover:text-white uppercase tracking-widest">
                                      View Protocol
                                   </Button>
                                   <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[9px] font-black px-3 hover:bg-slate-200 dark:hover:bg-slate-700 uppercase tracking-widest">
                                      Acknowledge
                                   </Button>
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                  <X size={14} className="text-slate-400 hover:text-rose-500" />
                               </Button>
                            </div>
                         </div>
                         {notif.status === 'new' && (
                           <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                         )}
                      </motion.div>
                   ))}
                </AnimatePresence>
             </div>

             <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-center bg-slate-50/50 dark:bg-slate-800/30">
                <Button variant="ghost" className="text-[11px] font-black text-slate-400 hover:text-primary uppercase tracking-[0.2em] group">
                   Load Archived Intelligence
                   <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
             </div>
          </div>
        </div>

        {/* 📊 Intelligence Matrix (Side Bento Cards) */}
        <div className="md:col-span-4 space-y-6">
           {/* System Health Bento */}
           <div className="hub-bento-card p-8 bg-slate-900 text-white border-none group overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                 <Zap size={120} />
              </div>
              <div className="relative z-10 space-y-6">
                 <div className="space-y-1">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-none rounded-lg text-[9px] font-black px-3 mb-2 tracking-widest uppercase">Operational</Badge>
                    <h3 className="text-xl font-black tracking-tight uppercase">Intelligence Health</h3>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                          <span className="text-slate-400">Neural Sync</span>
                          <span>98.2%</span>
                       </div>
                       <Progress value={98.2} className="h-1.5 bg-white/10" />
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                          <span className="text-slate-400">Security Shield</span>
                          <span className="text-emerald-400">Active</span>
                       </div>
                       <div className="grid grid-cols-5 gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={cn("h-1 rounded-full", i <= 4 ? "bg-emerald-500" : "bg-emerald-500/20")} />
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Quick Actions Bento */}
           <div className="hub-bento-card p-8 bg-white dark:bg-slate-900 border-slate-200/50 shadow-xl group">
              <h3 className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase mb-6 flex items-center gap-3">
                 <Sparkles size={14} className="text-primary" />
                 Global Commands
              </h3>
              <div className="grid grid-cols-2 gap-3">
                 {[
                   { label: 'Broadcast', icon: Globe },
                   { label: 'Alert_All', icon: AlertCircle },
                   { label: 'Email_Gen', icon: Mail },
                   { label: 'Shield_Lock', icon: Shield }
                 ].map((cmd) => (
                   <Button
                     key={cmd.label}
                     variant="outline"
                     className="flex flex-col items-center justify-center h-24 gap-2 rounded-xl border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 transition-all group/cmd"
                   >
                     <cmd.icon size={20} className="text-slate-400 group-hover/cmd:text-primary transition-colors" />
                     <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">{cmd.label}</span>
                   </Button>
                 ))}
              </div>
              <Button className="w-full mt-6 h-12 rounded-xl bg-slate-900 dark:bg-primary hover:scale-[1.02] transition-transform font-black text-[10px] tracking-widest uppercase text-white shadow-xl">
                 Execute Global Protocol
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
