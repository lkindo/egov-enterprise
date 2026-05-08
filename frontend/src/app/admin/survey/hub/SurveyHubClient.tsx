'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
 LayoutGrid, BarChart3, HelpCircle, Users, FileStack, Settings2,
 PieChart, Target, Zap, ArrowUpRight, Search, Plus, Loader2, Sparkles,
 Layers, Clock, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { Button } from '@/components/ui/button';

// Components
import PollManagePage from '../manage/page';
import SurveyStatsPage from '../stats/page';

export function SurveyHubClient() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const currentTab = searchParams.get('tab') || 'manage';

 const onTabChange = (value: string) => {
 const params = new URLSearchParams(searchParams);
 params.set('tab', value);
 router.push(`/admin/survey/hub?${params.toString()}`, { scroll: false });
 };

 return (
 <motion.div 
 initial="hidden"
 animate="visible"
 variants={hubContainerVariants}
 className="space-y-12 pb-24"
 >
 {/* 1. Dynamic Hub Header */}
 <motion.div variants={hubItemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-2">
 <div className="space-y-3">
 <div className="flex items-center gap-3">
 <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
 <span className="text-xs font-bold tracking-[0.5em] text-rose-500 uppercase leading-none px-3 py-1 bg-rose-500/5 rounded-full border border-rose-500/10">Survey Matrix</span>
 </div>
 <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight uppercase leading-none">
 Insight <span className="text-rose-500">Analytics</span>
 </h1>
 <p className="text-sm font-bold text-slate-400 max-w-lg leading-relaxed uppercase tracking-widest ">
 Enterprise feedback acquisition and sentiment analysis engine.
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="hidden sm:flex flex-col items-end mr-4">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Ȱ�� ���� ���</span>
 <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">12 / 48</span>
 </div>
 <Button 
 className="h-12 px-10 rounded-lg bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 group"
 >
 <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Launch New Survey
 </Button>
 </div>
 </motion.div>

 {/* 2. Metric Insight Grid */}
 <motion.div variants={hubItemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6 px-2">
 <MetricCard label="Global Response" value="8,241" trend="+12.4%" icon={Users} color="rose" />
 <MetricCard label="Completion Rate" value="94.2%" trend="+2.1%" icon={Target} color="emerald" />
 <MetricCard label="Insight Score" value="88/100" trend="Optimal" icon={Zap} color="amber" />
 <MetricCard label="Active Nodes" value="12 Units" trend="Running" icon={Layers} color="primary" />
 </motion.div>

 {/* 3. Navigation Matrix */}
 <motion.div variants={hubItemVariants} className="px-2">
 <Tabs value={currentTab} onValueChange={onTabChange} className="space-y-10">
 <div className="hub-glass-premium p-2 rounded-lg border-2 border-slate-100/50 shadow-xl inline-flex w-full md:w-auto overflow-x-auto scrollbar-hide">
 <TabsList className="bg-transparent gap-2 h-auto p-0 border-none">
 <TabTrigger value="manage" icon={LayoutGrid} label="���� ����" />
 <TabTrigger value="stats" icon={BarChart3} label="��� ���" />
 <TabTrigger value="questions" icon={HelpCircle} label="���� ���̺귯��" />
 <TabTrigger value="respondents" icon={Users} label="���� �׷�" />
 <TabTrigger value="templates" icon={FileStack} label="���ø�" />
 <TabTrigger value="settings" icon={Settings2} label="�ý��� ����" />
 </TabsList>
 </div>

 <div className="mt-10">
 <AnimatePresence mode="wait">
 <motion.div
 key={currentTab}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 transition={{ duration: 0.4, ease: "circOut" }}
 >
 <TabsContent value="manage" className="m-0 focus-visible:outline-none">
 <PollManagePage />
 </TabsContent>

 <TabsContent value="stats" className="m-0 focus-visible:outline-none">
 <SurveyStatsPage />
 </TabsContent>

 <TabsContent value="questions" className="m-0 focus-visible:outline-none">
 <PlaceholderCard title="���� �� ���� ���̺귯��" description="���� ������ ���� �ٽ� ���� �� ������ ������ �����մϴ�." icon={HelpCircle} />
 </TabsContent>

 <TabsContent value="respondents" className="m-0 focus-visible:outline-none">
 <PlaceholderCard title="���� �׷� ����" description="���� ���� ����� ����� ���� �� ���׸�Ʈ�� �����մϴ�." icon={Users} />
 </TabsContent>

 <TabsContent value="templates" className="m-0 focus-visible:outline-none">
 <PlaceholderCard title="���� ���ø� ����" description="ǥ��ȭ�� ���� ����� �����ϰ� ���� ������ ���� ��Ʈ�� �����մϴ�." icon={FileStack} />
 </TabsContent>

 <TabsContent value="settings" className="m-0 focus-visible:outline-none">
 <PlaceholderCard title="��� ��� ���� ����" description="�ý��� ���� ���� ������ ���� ���������� �����մϴ�." icon={Settings2} />
 </TabsContent>
 </motion.div>
 </AnimatePresence>
 </div>
 </Tabs>
 </motion.div>
 </motion.div>
 );
}

function TabTrigger({ value, icon: Icon, label }: { value: string, icon: any, label: string }) {
 return (
 <TabsTrigger 
 value={value} 
 className="data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-2xl rounded-lg h-11 px-8 font-bold text-xs tracking-widest uppercase gap-3 transition-all border border-transparent data-[state=active]:border-slate-800 hover:bg-slate-50"
 >
 <Icon size={16} /> {label}
 </TabsTrigger>
 );
}

function MetricCard({ label, value, trend, icon: Icon, color }: any) {
 const colorMap: any = {
 rose: "text-rose-500 bg-rose-500/5 border-rose-500/10",
 emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10",
 amber: "text-amber-500 bg-amber-500/5 border-amber-500/10",
 primary: "text-primary bg-primary/5 border-primary/10"
 };

 return (
 <div className="hub-glass-premium p-8 rounded-lg border-2 border-slate-100/50 flex flex-col gap-4 group hover:ring-[20px] hover:ring-slate-100/30 transition-all shadow-sm">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
 <div className={cn("p-2 rounded-lg border", colorMap[color])}>
 <Icon size={14} />
 </div>
 </div>
 <div className="space-y-1">
 <h4 className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</h4>
 <div className="flex items-center gap-2">
 <span className={cn("text-xs font-bold uppercase", color === 'emerald' ? 'text-emerald-500' : color === 'rose' ? 'text-rose-500' : 'text-slate-400')}>
 {trend}
 </span>
 <div className="h-[1px] flex-1 bg-slate-100" />
 </div>
 </div>
 </div>
 );
}

function PlaceholderCard({ title, description, icon: Icon }: any) {
 return (
 <div className="hub-glass-premium p-32 rounded-lg border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-8 group relative overflow-hidden">
 <div className="absolute top-0 right-0 p-12 opacity-[0.03] grayscale pointer-events-none group-hover:opacity-10 transition-opacity">
 <Icon size={180} />
 </div>
 <div className="w-24 h-24 rounded-lg bg-slate-50 shadow-2xl flex items-center justify-center text-rose-500 border-2 border-slate-100 group-hover:scale-110 group-hover:rotate-12 transition-all relative z-10">
 <Icon size={40} />
 </div>
 <div className="space-y-4 relative z-10">
 <h3 className="text-3xl font-bold tracking-tight text-slate-900 uppercase leading-none">{title}</h3>
 <p className="text-sm font-bold text-slate-400 max-w-sm mx-auto uppercase tracking-widest ">{description}</p>
 </div>
 <div className="flex gap-4 relative z-10 pt-4">
 <div className="h-1.5 w-8 rounded-full bg-rose-500/20" />
 <div className="h-1.5 w-8 rounded-full bg-rose-500/40" />
 <div className="h-1.5 w-8 rounded-full bg-rose-500/20" />
 </div>
 </div>
 );
}

