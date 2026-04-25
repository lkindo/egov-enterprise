'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check, 
  Bell, 
  ShieldAlert, 
  Activity, 
  Database, 
  Zap, 
  ArrowRight,
  Filter,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type?: 'SECURITY' | 'SYSTEM' | 'ACTIVITY' | 'INFO';
}

interface AppNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
}

type FilterType = 'ALL' | 'SECURITY' | 'SYSTEM' | 'ACTIVITY';

export function AppNotificationDrawer({ isOpen, onClose, notifications }: AppNotificationDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'ALL') return true;
    return n.type === activeFilter;
  });

  const getIcon = (type?: string) => {
    switch (type) {
      case 'SECURITY': return <ShieldAlert size={18} className="text-rose-500" />;
      case 'SYSTEM': return <Database size={18} className="text-amber-500" />;
      case 'ACTIVITY': return <Activity size={18} className="text-emerald-500" />;
      default: return <Bell size={18} className="text-primary" />;
    }
  };

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
           <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[9998] bg-slate-900/60 backdrop-blur-sm" 
               onClick={onClose} 
            />
            <motion.div 
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="fixed right-0 top-0 z-[9999] h-full w-full max-w-md border-l bg-white dark:bg-slate-950 shadow-[-40px_0_80px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col"
            >
              {/* Header Fabric */}
              <div className="flex h-24 items-center justify-between border-b px-8 bg-white dark:bg-slate-950 sticky top-0 z-20">
                <div className="space-y-1">
                  <h2 className="text-xl font-black flex items-center gap-3 tracking-tighter uppercase italic">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                       <Bell size={20} className="animate-pulse" />
                    </div>
                    Alert Sentinel
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">실시간쒖뒪님무결성피드</p>
                </div>
                <button 
                   onClick={onClose} 
                   className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all hover:rotate-90 group"
                >
                  <X size={24} className="group-hover:text-primary transition-colors" />
                </button>
              </div>

              {/* Advanced Filter Matrix */}
              <div className="p-6 border-b bg-slate-50/50 flex gap-2">
                 {(['ALL', 'SECURITY', 'SYSTEM', 'ACTIVITY'] as FilterType[]).map((f) => (
                    <button
                       key={f}
                       onClick={() => setActiveFilter(f)}
                       className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all",
                          activeFilter === f 
                             ? "bg-slate-900 text-white shadow-lg scale-105" 
                             : "bg-white text-slate-400 hover:bg-slate-100 border-2 border-slate-100"
                       )}
                    >
                       {f}
                    </button>
                 ))}
                 <button className="ml-auto w-10 h-10 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:border-rose-100 transition-all">
                    <Trash2 size={16} />
                 </button>
              </div>

              {/* Notification Stream */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.length === 0 ? (
                    <motion.div 
                       initial={{ opacity: 0, scale: 0.9 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="flex flex-col items-center justify-center h-full text-slate-200"
                    >
                      <Zap size={100} className="mb-8 opacity-20" />
                      <p className="text-sm font-black tracking-widest uppercase italic text-slate-400">CLEAN_STATE: NO_ALERTS</p>
                    </motion.div>
                  ) : (
                    filteredNotifications.map((notif, idx) => (
                      <motion.div
                        layout
                        key={notif.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "group relative p-6 rounded-xl border-2 transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-sm",
                          notif.isRead
                            ? "bg-slate-50/30 border-slate-50 opacity-60"
                            : "bg-white border-slate-100 shadow-xl hover:shadow-primary/5 hover:border-primary/20",
                          !notif.isRead && notif.type === 'SECURITY' && "border-rose-100 bg-rose-50/20"
                        )}
                      >
                        <div className="flex justify-between items-start gap-4 relative z-10">
                          <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0",
                             notif.isRead ? "bg-slate-100 text-slate-400" : "bg-white"
                          )}>
                             {getIcon(notif.type)}
                          </div>
                          <div className="flex-1 space-y-1 min-w-0">
                             <div className="flex items-center justify-between">
                                <h3 className={cn("text-sm font-black tracking-tight transition-colors truncate pr-4", !notif.isRead && "text-slate-900")}>
                                   {notif.title}
                                </h3>
                                {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />}
                             </div>
                             <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-2 font-medium italic">
                                {notif.message}
                             </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 relative z-10 px-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{notif.time}</span>
                          <button className="flex items-center gap-2 text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 tracking-[0.2em] uppercase italic">
                            RESOLVE_NODE <ArrowRight size={14} />
                          </button>
                        </div>

                        {/* Background Decoration */}
                        {!notif.isRead && notif.type === 'SECURITY' && (
                           <div className="absolute right-0 top-0 p-4 opacity-5">
                              <ShieldAlert size={80} />
                           </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Sticky Control */}
              <div className="p-8 border-t bg-white dark:bg-slate-950">
                 <Button className="w-full h-14 rounded-xl bg-slate-900 text-white font-black tracking-[0.3em] uppercase text-[10px] shadow-2xl hover:bg-primary transition-all">
                    READ_ALL_BROADCASTS
                 </Button>
              </div>
            </motion.div>
           </>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
