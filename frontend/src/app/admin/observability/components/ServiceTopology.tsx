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
  status?: 'active' | 'warning' | 'idle';
  latency?: string;
}

const TopologyNode = ({ label, icon, x, y, status = 'active', latency }: NodeProps) => {
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
        {latency && (
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Activity size={10} className="text-emerald-400" />
            <span className="text-xs text-emerald-400/80 font-medium">{latency}</span>
          </div>
        )}
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
  const nodes = [
    { id: 'user', label: 'Global Traffic', x: 15, y: 50, icon: <Users />, latency: '12ms' },
    { id: 'front', label: 'Edge Network', x: 35, y: 50, icon: <Monitor />, latency: '4ms' },
    { id: 'api', label: 'API Gateway', x: 55, y: 35, icon: <ShieldCheck />, latency: '24ms' },
    { id: 'worker', label: 'App Nodes', x: 55, y: 65, icon: <Cpu />, latency: '128ms', status: 'warning' },
    { id: 'db', label: 'Primary DB', x: 85, y: 50, icon: <Database />, latency: '2ms' },
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

      {/* Metrics Legend */}
      <div className="absolute bottom-6 left-8 flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Health: 100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Traffic: 2.1k/s</span>
        </div>
      </div>

      <div className="absolute top-6 right-8">
        <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md flex items-center gap-2">
          <Activity size={12} className="text-emerald-400" />
          <span className="text-xs text-surface-inverse-muted font-bold tracking-tight">System Map v2.1</span>
        </div>
      </div>
    </div>
  );
}
