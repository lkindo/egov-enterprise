'use client';

import React, { useState } from 'react';
import {
 GitBranch,
 Settings,
 History,
 Play,
 Plus,
 ArrowLeft,
 Search,
 CheckCircle2,
 Clock,
 MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowCanvas, WorkflowNode, WorkflowEdge } from '@/app/components/ui/workflow-canvas';

const MOCK_WORKFLOW_NODES: WorkflowNode[] = [
 { id: '1', type: 'start', label: '?´ê? ? ì²­ ?œì‘', status: 'completed', position: { x: 50, y: 100 } },
 { id: '2', type: 'step', label: '? ì²­???‘ì„± ë°??œì¶œ', assignee: '?ê¸¸??(? ì²­??', status: 'completed', position: { x: 300, y: 100 } },
 { id: '3', type: 'decision', label: '?€??ê²€??ë°??¹ì¸', assignee: '?´ìˆœ??(?€??', status: 'current', position: { x: 550, y: 100 } },
 { id: '4', type: 'step', label: '?¸ì‚¬ê³?ìµœì¢… ?•ì •', assignee: 'ê°•ê°ì°?(?¸ì‚¬?€)', status: 'pending', position: { x: 800, y: 300 } },
 { id: '5', type: 'end', label: '?´ê? ?¹ì¸ ?„ë£Œ', status: 'pending', position: { x: 1050, y: 300 } },
];

const MOCK_WORKFLOW_EDGES: WorkflowEdge[] = [
 { id: 'e1-2', from: '1', to: '2' },
 { id: 'e2-3', from: '2', to: '3' },
 { id: 'e3-4', from: '3', to: '4', label: '?¹ì¸?? },
 { id: 'e4-5', from: '4', to: '5' },
];

export default function WorkflowPage() {
 const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(MOCK_WORKFLOW_NODES[2]);

 return (
 <div className="space-y-10 pb-20 animate-in fade-in duration-700">
 {/* 1. Page Header */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div className="space-y-2">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-primary/10 rounded-xl text-primary">
 <GitBranch size={18} />
 </div>
 <span className="text-sm font-black text-primary tracking-tight">?Œí¬?Œë¡œ???”ì§„</span>
 </div>
 <h1 className="text-3xl font-black tracking-tighter text-foreground ">
 Process <span className="text-primary ">ìº”ë²„??/span>
 </h1>
 <p className="text-muted-foreground font-bold text-sm max-w-lg">
 ?„ë©”???´ë²¤??ê¸°ë°˜???Œí¬?Œë¡œ???”ì§„???µí•´ ë¹„ì¦ˆ?ˆìŠ¤ ?„ë¡œ?¸ìŠ¤ë¥??¤ê³„?˜ê³  ?¤ì‹œê°?ì§„í–‰ ?íƒœë¥??œê°?”í•©?ˆë‹¤.
 </p>
 </div>

 <div className="flex items-center gap-3">
 <button className="flex items-center gap-2 px-6 py-3 bg-muted rounded-full font-black text-sm tracking-tight hover:bg-muted/80 transition-all">
 <History size={16} /> History
 </button>
 <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-black text-sm tracking-tight shadow-xl hover:bg-primary/90 transition-all">
 <Plus size={16} /> New Workflow
 </button>
 </div>
 </div>

 {/* 2. Main Canvas Area */}
 <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
 <div className="xl:col-span-3 space-y-6">
 <div className="flex items-center justify-between px-6">
 <div className="flex items-center gap-6">
 <div className="flex items-center gap-2">
 <span className="text-sm font-black text-foreground">WORKFLOW:</span>
 <span className="text-sm font-bold text-muted-foreground ">?°ì°¨/?´ê? ê²°ì¬ ?„ë¡œ?¸ìŠ¤_v1.2</span>
 </div>
 <div className="h-4 w-px bg-muted" />
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-emerald-500" />
 <span className="text-[10px] font-black text-muted-foreground ">?œì„±</span>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button className="p-2 hover:bg-muted rounded-full transition-colors"><Settings size={14} /></button>
 <button className="p-2 hover:bg-muted rounded-full transition-colors"><Search size={14} /></button>
 </div>
 </div>

 <WorkflowCanvas
 nodes={MOCK_WORKFLOW_NODES}
 edges={MOCK_WORKFLOW_EDGES}
 onNodeClick={setSelectedNode}
 />
 </div>

 {/* 3. Detail Sidebar */}
 <div className="space-y-6">
 <div className="p-8 border rounded-[3rem] bg-card shadow-lg space-y-8">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-black text-foreground tracking-tight">?¨ê³„ ?ì„¸</h3>
 <button className="p-2 hover:bg-muted rounded-full"><MoreHorizontal size={14} /></button>
 </div>

 {selectedNode ? (
 <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
 <div className="space-y-4">
 <div className={cn(
 "w-14 h-14 rounded-2xl flex items-center justify-center",
 selectedNode.status === 'current' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
 )}>
 {selectedNode.status === 'completed' ? <CheckCircle2 size={30} /> : <Clock size={30} />}
 </div>
 <div>
 <h4 className="text-xl font-black tracking-tight">{selectedNode.label}</h4>
 <p className="text-[10px] font-black text-muted-foreground mt-1 tracking-tight">{selectedNode.id} / {selectedNode.type}</p>
 </div>
 </div>

 <div className="space-y-6">
 <div className="space-y-2">
 <span className="text-[9px] font-black text-muted-foreground tracking-[0.2em]">?„ì¬ ?´ë‹¹??/span>
 <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-white/5">
 <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-sm ">
 {selectedNode.assignee?.charAt(0)}
 </div>
 <span className="text-sm font-black">{selectedNode.assignee || 'ë¯¸ì •'}</span>
 </div>
 </div>

 <div className="space-y-2">
 <span className="text-[9px] font-black text-muted-foreground tracking-[0.2em]">ì²˜ë¦¬ ë¡œê·¸</span>
 <div className="space-y-4 border-l-2 border-muted ml-2 pl-6 pt-2">
 <div className="relative">
 <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-background" />
 <p className="text-sm font-black">? ì²­???˜ì‹  ?„ë£Œ</p>
 <p className="text-[10px] text-muted-foreground font-bold ">2026-02-22 14:20:01</p>
 </div>
 <div className="relative opacity-50">
 <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-muted border-4 border-background" />
 <p className="text-sm font-black">?€???´ë? ?ì‹ </p>
 <p className="text-[10px] text-muted-foreground font-bold ">?€ê¸°ì¤‘...</p>
 </div>
 </div>
 </div>
 </div>

 <button className="w-full py-5 bg-primary text-white rounded-full font-black text-sm tracking-tight shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
 ?¹ì¸ ì²˜ë¦¬?˜ê¸°
 </button>
 </div>
 ) : (
 <div className="py-20 text-center opacity-30 ">
 <p className="text-sm font-bold">?¸ë“œë¥?? íƒ?˜ì—¬ ?ì„¸ ?•ë³´ë¥??•ì¸?˜ì„¸??</p>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
