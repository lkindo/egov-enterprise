'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  RefreshCcw,
  ExternalLink,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// P2: Dynamic Import for the heavy Topology visualization
const ServiceTopology = dynamic(() => import('./components/ServiceTopology'), {
  ssr: false,
  loading: () => <div className="w-full h-[450px] bg-slate-900/40 rounded-[2.5rem] animate-pulse flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest">Initializing Map...</div>
});

const MetricCard = ({ title, value, unit, icon: Icon, color, trend }: any) => (
  <motion.div
    whileHover={{ y: -5, scale: 1.02 }}
    className="relative group"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rounded-3xl`} />
    <Card className="bg-slate-900/40 backdrop-blur-xl border-white/5 rounded-3xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl bg-white/5 ${color.split(' ')[1]} shadow-xl`}>
            <Icon size={20} />
          </div>
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}>
              {trend}
            </span>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
            <span className="text-[11px] font-bold text-slate-500 uppercase">{unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function ObservabilityPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-8 space-y-8 min-h-screen">
      {/* Premium Header Container */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Real-time Intelligence</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-800 dark:text-white flex items-center gap-4">
            시스템 통합 관제
            <Zap className="text-primary fill-primary" size={32} />
          </h1>
          <p className="text-slate-500 max-w-lg font-medium">
            전체 분산 아키텍처의 흐름과 인프라 상태를 실시간으로 모니터링합니다. 
            AI 기반 예측 모델이 잠재적 병목 지점을 사전에 감지합니다.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="bg-white/5 border-white/10 rounded-2xl h-12 px-6 font-bold hover:bg-white/10">
            <RefreshCcw size={16} className="mr-2 opacity-60" />
            Live Sync
          </Button>
          <Button className="bg-slate-900 hover:bg-black rounded-2xl h-12 px-8 font-extrabold shadow-xl shadow-primary/20">
            데이터 익스포트
            <ExternalLink size={16} className="ml-2 opacity-60" />
          </Button>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Main Topology Section */}
        <motion.div variants={itemVariants}>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-[2.6rem] blur-xl opacity-50 group-hover:opacity-75 transition duration-1000" />
            <ServiceTopology />
          </div>
        </motion.div>

        {/* Dynamic Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div variants={itemVariants}>
            <MetricCard 
              title="Global API Traffic"
              value="2,481"
              unit="Req/sec"
              icon={BarChart3}
              color="from-blue-500 to-indigo-600 text-blue-400"
              trend="+12.4%"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard 
              title="System Latency"
              value="42"
              unit="ms (P99)"
              icon={Clock}
              color="from-emerald-500 to-teal-600 text-emerald-400"
              trend="-4ms"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard 
              title="Error Rate"
              value="0.02"
              unit="%"
              icon={AlertTriangle}
              color="from-rose-500 to-pink-600 text-rose-400"
              trend="Stable"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard 
              title="Node Utilization"
              value="68.4"
              unit="%"
              icon={Activity}
              color="from-amber-500 to-orange-600 text-amber-400"
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Decorative Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        className="text-center pt-8"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
          eGov Enterprise Observability Engine v5.0.0
        </p>
      </motion.div>
    </div>
  );
}
