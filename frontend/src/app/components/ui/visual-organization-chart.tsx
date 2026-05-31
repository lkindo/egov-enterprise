'use client';

import React, { useState } from 'react';
import {
 Users,
 Search,
 Mail,
 Phone,
 MapPin,
 ChevronRight,
 ChevronDown,
 Zap,
 MoreHorizontal,
 Plus,
 ArrowUpRight,
 ShieldCheck,
 Building2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface OrgNode {
 id: string;
 name: string;
 role: string;
 dept: string;
 email: string;
 phone: string;
 avatar?: string;
 status: 'online' | 'busy' | 'offline';
 children?: OrgNode[];
}

const MOCK_ORG_DATA: OrgNode = {
 id: 'o-1',
 name: '김상무',
 role: 'Chief Executive Officer',
 dept: '경영지원본부',
 email: 'ceo@company.com',
 phone: '010-1234-5678',
 status: 'online',
 children: [
 {
 id: 'o-2',
 name: '이본부',
 role: 'Head of Technology',
 dept: '기술전략부',
 email: 'tech@company.com',
 phone: '010-2222-3333',
 status: 'busy',
 children: [
 { id: 'o-3', name: '박팀장', role: 'Dev Lead', dept: '백엔드 개발팀', email: 'p@c.com', phone: '010-1', status: 'online' },
 { id: 'o-4', name: '최리드', role: 'UI/UX Lead', dept: '디자인팀', email: 'c@c.com', phone: '010-2', status: 'online' },
 ]
 },
 {
 id: 'o-5',
 name: '정본부',
 role: 'Head of Operations',
 dept: '운영기획부',
 email: 'ops@company.com',
 phone: '010-4444-5555',
 status: 'offline',
 children: [
 { id: 'o-6', name: '강팀장', role: 'Audit Lead', dept: '보안 점검팀', email: 'k@c.com', phone: '010-3', status: 'online' },
 ]
 }
 ]
};

export function VisualOrganizationChart() {
 const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['o-1', 'o-2']));
 const [selectedNode, setSelectedNode] = useState<OrgNode | null>(MOCK_ORG_DATA);
 const [search, setSearch] = useState('');

 const toggleNode = (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 const newExpanded = new Set(expandedNodes);
 if (newExpanded.has(id)) newExpanded.delete(id);
 else newExpanded.add(id);
 setExpandedNodes(newExpanded);
 };

 const renderNode = (node: OrgNode, depth: number = 0) => {
 const isExpanded = expandedNodes.has(node.id);
 const isSelected = selectedNode?.id === node.id;

 return (
 <div key={node.id} className="flex flex-col gap-3">
 {/* Node Item */}
 <div
 onClick={() => setSelectedNode(node)}
 className={cn(
 "group relative flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer min-w-[280px]",
 isSelected ? "bg-card border-primary shadow-xl shadow-primary/5 ring-4 ring-primary/5" : "bg-muted/10 border-transparent hover:bg-card hover:border-primary/20"
 )}
 style={{ marginLeft: depth * 40 }}
 >
 {/* Connection Line (Left) */}
 {depth > 0 && (
 <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-10 h-0.5 bg-gradient-to-l from-primary/20 to-transparent" />
 )}

 <div className="relative">
 <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border flex items-center justify-center font-bold text-slate-400 group-hover:scale-110 transition-transform">
 {node.name.substring(0, 1)}
 </div>
 <div className={cn(
 "absolute -bottom-1 -right-1 w-4 h-4 rounded-lg border-4 border-card",
 node.status === 'online' ? "bg-emerald-500" : node.status === 'busy' ? "bg-amber-500" : "bg-slate-300"
 )} />
 </div>

 <div className="flex-1 min-w-0">
 <h4 className="text-sm font-bold text-foreground tracking-tight truncate">{node.name}</h4>
 <p className="text-xs font-bold text-muted-foreground opacity-60 tracking-tight">{node.role}</p>
 </div>

 {node.children && (
 <Button
 variant="ghost"
 size="icon"
 className="rounded-lg h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all"
 onClick={(e) => toggleNode(node.id, e)}
 >
 {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
 </Button>
 )}
 </div>

 {/* Children Render */}
 {isExpanded && node.children && (
 <div className="flex flex-col gap-3">
 {node.children.map(child => renderNode(child, depth + 1))}
 </div>
 )}
 </div>
 );
 };

 return (
 <div className="flex flex-col md:flex-row gap-8 h-[calc(100vh-12rem)] animate-in fade-in duration-700">
 {/* Left Sidebar: Navigation & Search */}
 <div className="w-full md:w-96 flex flex-col gap-6">
 <div className="p-8 bg-card border-2 border-primary/5 rounded-lg shadow-xl flex flex-col gap-6">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-primary/10 rounded-lg text-primary"><Users size={20} /></div>
 <div>
 <h3 className="text-sm font-bold tracking-tight">글로벌 디렉터리</h3>
 <p className="text-xs font-bold text-muted-foreground opacity-50 tracking-tight">Organization & Hierarchy</p>
 </div>
 </div>

 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
 <input
 className="w-full bg-muted/40 border-none rounded-lg py-3 pl-12 pr-4 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all font-medium"
 placeholder="검색..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>

 <div className="space-y-3 pt-4 border-t border-primary/5">
 {[
 { id: 'd1', name: '경영지원본부', count: 12, icon: <ShieldCheck size={14} /> },
 { id: 'd2', name: '기술전략부', count: 45, icon: <Zap size={14} /> },
 { id: 'd3', name: '운영기획부', count: 28, icon: <ArrowUpRight size={14} /> },
 ].map(dept => (
 <button key={dept.id} className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-primary/5 transition-all group">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-background rounded-lg border text-muted-foreground group-hover:text-primary transition-colors">{dept.icon}</div>
 <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground">{dept.name}</span>
 </div>
 <span className="text-xs font-bold text-primary px-2 bg-primary/5 rounded-lg">{dept.count}</span>
 </button>
 ))}
 </div>
 </div>

 <div className="mt-auto p-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-2xl relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-125 transition-transform">
 <Building2 size={80} />
 </div>
 <h4 className="relative z-10 text-sm font-bold tracking-tight opacity-80 mb-2">기업 통계</h4>
 <div className="relative z-10 grid grid-cols-2 gap-4 mt-6">
 <div>
 <p className="text-xs font-bold opacity-60">총 직원</p>
 <p className="text-2xl font-bold tracking-tighter">1,204</p>
 </div>
 <div>
 <p className="text-xs font-bold opacity-60">부서</p>
 <p className="text-2xl font-bold tracking-tighter">24</p>
 </div>
 </div>
 <Button className="relative z-10 mt-8 w-full bg-white/10 hover:bg-white/20 border-none rounded-lg font-bold text-xs tracking-tight h-12">
 Download Full Chart
 </Button>
 </div>
 </div>

 {/* Center & Right: Hierarchy & Detail View */}
 <div className="flex-1 flex flex-col gap-6 overflow-hidden">
 {/* Tree Canvas */}
 <div className="flex-1 min-h-0 bg-card border-2 border-primary/5 rounded-lg p-12 shadow-2xl overflow-auto custom-scrollbar relative">
 <div className="inline-flex flex-col gap-6">
 {renderNode(MOCK_ORG_DATA)}
 </div>

 {/* Watermark/Logo */}
 <div className="absolute bottom-8 right-12 opacity-5 pointer-events-none">
 <Users size={120} />
 </div>
 </div>

 {/* Selection Detail Banner */}
 {selectedNode && (
 <div className="bg-card border-2 border-primary/10 rounded-lg p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-500 overflow-hidden relative">
 <div className="absolute top-0 right-0 p-8 opacity-5">
 <Plus size={100} className="text-primary rotate-45" />
 </div>
 <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
 <div className="flex items-center gap-6">
 <div className="w-20 h-11 rounded-lg bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-primary/20 ring-4 ring-primary/10">
 {selectedNode.name.substring(0, 1)}
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-3">
 <h2 className="text-2xl font-bold tracking-tighter">{selectedNode.name}</h2>
 <span className="text-xs font-bold text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 tracking-tight">{selectedNode.status}</span>
 </div>
 <p className="text-sm font-bold text-primary tracking-wide">{selectedNode.role} 님 <span className="text-muted-foreground opacity-60">{selectedNode.dept}</span></p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <div className="flex flex-col items-end gap-1 pr-6 border-r border-primary/5">
 <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
 <Mail size={14} className="text-primary/40" /> {selectedNode.email}
 </div>
 <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
 <Phone size={14} className="text-primary/40" /> {selectedNode.phone}
 </div>
 </div>
 <div className="flex gap-2">
 <Button className="rounded-lg h-11 w-14 p-0 shadow-lg shadow-primary/20 animate-bounce-subtle"><Mail size={20} /></Button>
 <Button variant="outline" className="rounded-lg h-11 w-14 border-2 hover:text-primary hover:bg-primary/5"><MoreHorizontal size={20} /></Button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
