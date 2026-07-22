'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users,  
  Monitor,  
  Cpu,  
  Database,  
  ShieldCheck,  
  Activity } from 'lucide-react';

interface NodeProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  x: number;
  y: number;
  /**
   * 노드 상태. 실측 소스(액추에이터 health components)가 연동되기 전까지는 기본값 'idle'(중립 회색)이다.
   * 기본값을 'active'(초록)로 두면 계측 없이 전 노드가 정상으로 보여 장애를 은폐한다.
   */
  status?: 'active' | 'warning' | 'idle';
}

const TopologyNode = ({ label, icon, x, y, status = 'idle' }: NodeProps) => {
  const statusColor = status === 'active' ? 'text-emerald-400' : status === 'warning' ? 'text-amber-400' : 'text-muted-foreground';
  const glowColor = status === 'active' ? 'rgba(52, 211, 153, 0.4)' : status === 'warning' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(148, 163, 184, 0.2)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute flex flex-col items-center gap-3"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative">
        {/* Pulsing Aura */}
        {status === 'active' && (
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-lg"
            style={{ backgroundColor: glowColor, filter: 'blur(12px)' }}
          />
        )}
        
        <div className="w-16 h-11 bg-surface-inverse/80 backdrop-blur-xl border border-white/10 rounded-lg flex items-center justify-center shadow-2xl relative z-10">
          <div className={`${statusColor}`}>
            {React.cloneElement(icon as React.ReactElement<{ size: number }>, { size: 28 })}
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-bold text-surface-inverse-foreground uppercase tracking-tighter opacity-90">{label}</p>
      </div>
    </motion.div>
  );
};

const ConnectionLine = ({ start, end, duration = 3 }: { start: [number, number], end: [number, number], duration?: number }) => {
  return (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none" 
      style={{ zIndex: 0 }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Static Base Line */}
      <line
        x1={start[0]}
        y1={start[1]}
        x2={end[0]}
        y2={end[1]}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="0.2"
      />
      
      {/* Animated Flow Dot */}
      <motion.circle
        r="0.5"
        fill="#34d399"
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: "100%" }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
        style={{
          offsetPath: `path('M ${start[0]} ${start[1]} L ${end[0]} ${end[1]}')`,
        }}
      />

      {/* Glowing Moving Line Segment */}
      <motion.line
        x1={start[0]}
        y1={start[1]}
        x2={end[0]}
        y2={end[1]}
        stroke="url(#lineGradient)"
        strokeWidth="0.3"
        strokeDasharray="5 45"
        animate={{ strokeDashoffset: [-50, 0] }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      />
      
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default function ServiceTopology() {
  // [P1-5] 노드별 지연시간(12ms/4ms/24ms/128ms/2ms)과 'warning' 상태는 계측값이 아니라 고정 문자열이었다.
  //        관제 화면에서 특정 노드가 느리다고 오인하게 만들므로 제거하고, 구성 관계만 남긴다.
  //        실측 배선 시 /actuator/health components 또는 토폴로지 API 결과로 status·latency 를 채운다.
  const nodes = [
    { id: 'user', label: 'Global Traffic', x: 15, y: 50, icon: <Users /> },
    { id: 'front', label: 'Edge Network', x: 35, y: 50, icon: <Monitor /> },
    { id: 'api', label: 'API Gateway', x: 55, y: 35, icon: <ShieldCheck /> },
    { id: 'worker', label: 'App Nodes', x: 55, y: 65, icon: <Cpu /> },
    { id: 'db', label: 'Primary DB', x: 85, y: 50, icon: <Database /> },
  ];

  return (
    <div className="relative w-full h-[450px] bg-surface-inverse/40 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-md">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} 
      />

      {/* Gradient Glows */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-lg blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-lg blur-[100px] pointer-events-none" />

      {/* Connections (Manual Wiring for exact control) */}
      <ConnectionLine start={[15, 50]} end={[35, 50]} duration={4} />
      <ConnectionLine start={[35, 50]} end={[55, 35]} duration={3} />
      <ConnectionLine start={[35, 50]} end={[55, 65]} duration={5} />
      <ConnectionLine start={[55, 35]} end={[85, 50]} duration={2} />
      <ConnectionLine start={[55, 65]} end={[85, 50]} duration={6} />

      {/* Nodes */}
      {nodes.map(node => (
        <TopologyNode key={node.id} {...node as NodeProps} />
      ))}

      {/*
        [P1-5] 'Health: 100%' · 'Traffic: 2.1k/s' 고정 범례 제거 —
        어떤 계측도 없이 상시 100% 정상을 표시해 장애를 은폐하는 지표였다.
      */}
      <div className="absolute bottom-6 left-8">
        <span className="text-xs text-surface-inverse-muted font-bold uppercase tracking-wider">
          서비스 구성 관계도 (참고용)
        </span>
      </div>

      <div className="absolute top-6 right-8">
        <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md flex items-center gap-2">
          <Activity size={12} aria-hidden="true" className="text-amber-400" />
          <span className="text-xs text-surface-inverse-muted font-bold tracking-tight">샘플 데이터 · 실측 미연동</span>
        </div>
      </div>
    </div>
  );
}
