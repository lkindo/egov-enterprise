'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Server, 
  Database, 
  Globe, 
  Network, 
  Cpu, 
  Activity, 
  Zap, 
  ShieldCheck,
  ZapOff,
  Radio,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTopologyData } from '@/lib/hooks/use-topology-data';

interface Node {
  id: string;
  label: string;
  type: 'lb' | 'api' | 'db' | 'cache' | 'ext';
  status: 'up' | 'down' | 'warning';
  x: number;
  y: number;
}

interface Link {
  source: string;
  target: string;
  traffic: number; // 0 to 100
}

const NODES: Node[] = [
  { id: 'lb-01', label: 'Cloud Front / LB', type: 'lb', status: 'up', x: 100, y: 300 },
  { id: 'api-01', label: 'API Server Node A', type: 'api', status: 'up', x: 350, y: 150 },
  { id: 'api-02', label: 'API Server Node B', type: 'api', status: 'warning', x: 350, y: 450 },
  { id: 'db-01', label: 'PostgreSQL Primary', type: 'db', status: 'up', x: 650, y: 150 },
  { id: 'cache-01', label: 'Redis Cache Fabric', type: 'cache', status: 'up', x: 650, y: 450 },
  { id: 'ext-01', label: 'External Auth API', type: 'ext', status: 'up', x: 350, y: 650 },
];

const INITIAL_LINKS: Link[] = [
  { source: 'lb-01', target: 'api-01', traffic: 85 },
  { source: 'lb-01', target: 'api-02', traffic: 45 },
  { source: 'api-01', target: 'db-01', traffic: 95 },
  { source: 'api-02', target: 'db-01', traffic: 20 },
  { source: 'api-01', target: 'cache-01', traffic: 60 },
  { source: 'api-02', target: 'cache-01', traffic: 30 },
  { source: 'api-01', target: 'ext-01', traffic: 15 },
];

export const TopologyMap = () => {
  const { data: realData } = useTopologyData();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const getRealNodeStatus = (type: Node['type'], index: number): Node['status'] => {
     if (!realData || realData.length === 0) return 'up';
     const matches = realData.filter(d => d.type === type);
     if (matches[index]) return matches[index].status as any;
     return 'up';
  };

  const getRealNodeMeta = (nodeId: string) => {
     const node = NODES.find(n => n.id === nodeId);
     if (!node) return null;
     const typeMatches = realData?.filter(d => d.type === node.type) || [];
     const idx = nodeId.endsWith('01') ? 0 : 1;
     return typeMatches[idx] || null;
  };

  const currentNodes = NODES.map(node => {
     const status = (node.id === 'lb-01') ? 'up' : getRealNodeStatus(node.type, node.id.endsWith('01') ? 0 : 1);
     return { ...node, status };
  });

  const getNodeIcon = (type: Node['type']) => {
    switch (type) {
      case 'lb': return <Globe size={24} />;
      case 'api': return <Server size={24} />;
      case 'db': return <Database size={24} />;
      case 'cache': return <Zap size={24} />;
      case 'ext': return <Share2 size={24} />;
    }
  };

  const getNodeColor = (status: Node['status']) => {
    switch (status) {
      case 'up': return 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
      case 'warning': return 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]';
      case 'down': return 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]';
    }
  };

  const nodeMeta = hoveredNode ? getRealNodeMeta(hoveredNode) : null;

  return (
    <div className="relative w-full h-[700px] bg-slate-950 rounded-[3rem] overflow-hidden border border-white/5 group shadow-2xl">
      {/* Dynamic Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="50%" stopColor="rgba(59,130,246,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
          
          <marker id="arrow" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.2)" />
          </marker>
        </defs>

        {INITIAL_LINKS.map((link, idx) => {
          const sNode = currentNodes.find(n => n.id === link.source)!;
          const tNode = currentNodes.find(n => n.id === link.target)!;
          const isRelated = hoveredNode === link.source || hoveredNode === link.target;
          const isDown = sNode.status === 'down' || tNode.status === 'down';

          return (
            <g key={`link-${idx}`}>
              <motion.line
                x1={`${sNode.x / 800 * 100}%`}
                y1={`${sNode.y / 800 * 100}%`}
                x2={`${tNode.x / 800 * 100}%`}
                y2={`${tNode.y / 800 * 100}%`}
                stroke={isRelated ? "rgba(59,130,246,0.6)" : "rgba(255,255,255,0.1)"}
                strokeWidth={isRelated ? 3 : 2}
                transition={{ duration: 0.5 }}
                markerEnd="url(#arrow)"
              />
              
              {/* Traffic Particles */}
              <motion.circle
                r="3"
                fill="#3B82F6"
                style={{ filter: 'blur(2px)' }}
                initial={{ 
                    cx: `${sNode.x / 800 * 100}%`, 
                    cy: `${sNode.y / 800 * 100}%`,
                    opacity: 0
                }}
                animate={{
                   cx: [`${sNode.x / 800 * 100}%`, `${tNode.x / 800 * 100}%`],
                   cy: [`${sNode.y / 800 * 100}%`, `${tNode.y / 800 * 100}%`],
                   opacity: isDown ? 0 : [0, 1, 0]
                }}
                transition={{
                  duration: (100 - link.traffic) / 20 + 2,
                  repeat: Infinity,
                  ease: "linear",
                  delay: idx * 0.5
                }}
              />
            </g>
          );
        })}
      </svg>

      <div className="relative z-10 w-full h-full">
        {currentNodes.map((node) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ 
              left: `${node.x / 800 * 100}%`, 
              top: `${node.y / 800 * 100}%` 
            }}
          >
            <div className="flex flex-col items-center gap-4">
               <div className={cn(
                 "w-20 h-20 rounded-3xl flex items-center justify-center border border-white/10 transition-all duration-500",
                 hoveredNode === node.id ? "bg-slate-800 scale-110" : "bg-slate-900",
                 node.status === 'down' ? 'border-rose-500/50' : node.status === 'warning' ? 'border-amber-500/50' : 'border-emerald-500/50'
               )}>
                 <div className={cn("text-white", hoveredNode === node.id && "text-primary animate-pulse")}>
                   {getNodeIcon(node.type)}
                 </div>
                 
                 {/* Status Indicator Dot */}
                 <div className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 rounded-full border-4 border-slate-950",
                    getNodeColor(node.status)
                 )} />
               </div>
               
               <div className="text-center">
                 <p className="text-[10px] font-black tracking-tighter text-white uppercase opacity-100 group-hover:opacity-100 transition-opacity">
                   {node.label}
                 </p>
                 <p className={cn(
                   "text-[8px] font-bold uppercase tracking-widest",
                   node.status === 'up' ? 'text-emerald-500' : node.status === 'warning' ? 'text-amber-500' : 'text-rose-500'
                 )}>
                   {node.status.toUpperCase()}
                 </p>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Info Panel Overlay */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-10 right-10 w-80 bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl z-20"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black text-white tracking-tighter uppercase italic">노드 실시간 지표</h4>
                <Activity size={18} className="text-primary animate-pulse" />
              </div>
              
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">SysName</span>
                   <span className="text-xs font-mono font-bold text-white max-w-[150px] truncate" title={nodeMeta?.label || hoveredNode}>{nodeMeta?.label || hoveredNode}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Health</span>
                   <span className={cn(
                       "text-xs font-bold",
                       nodeMeta?.status === 'up' ? "text-emerald-400" : "text-rose-400"
                   )}>{nodeMeta?.status === 'up' ? "98.4%" : "0.0%"}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Ip:Port</span>
                   <span className="text-xs font-bold text-primary">{nodeMeta?.ip || '0.0.0.0'}:{nodeMeta?.port || '80'}</span>
                </div>
              </div>

              <div className="space-y-3">
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Real-time Throughput</p>
                 <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: nodeMeta?.status === 'up' ? "75%" : "0%" }}
                        className="h-full bg-primary shadow-[0_0_10px_#3B82F6]" 
                    />
                 </div>
              </div>
              
              {nodeMeta?.status === 'down' && (
                  <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                      <ZapOff size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Service Unreachable</span>
                  </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-10 left-10 flex gap-6">
         <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">Up</span>
         </div>
         <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">Warning</span>
         </div>
         <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">Down</span>
         </div>
      </div>
      
      <div className="absolute bottom-10 right-10 flex items-center gap-4 text-white/20">
         <Radio size={20} className="animate-pulse" />
         <span className="text-[10px] font-black tracking-[0.5em] uppercase italic">Sentinel Topology Stream</span>
      </div>
    </div>
  );
};
