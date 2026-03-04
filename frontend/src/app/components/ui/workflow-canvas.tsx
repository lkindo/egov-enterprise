'use client';

import React, { useState } from 'react';
import {
    Play,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    User,
    MoreVertical,
    Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkflowStatus = 'completed' | 'current' | 'pending' | 'failed';

export interface WorkflowNode {
    id: string;
    type: 'start' | 'step' | 'decision' | 'end';
    label: string;
    assignee?: string;
    status: WorkflowStatus;
    position: { x: number; y: number };
}

export interface WorkflowEdge {
    id: string;
    from: string;
    to: string;
    label?: string;
}

interface WorkflowCanvasProps {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    className?: string;
    onNodeClick?: (node: WorkflowNode) => void;
}

export function WorkflowCanvas({ nodes, edges, className, onNodeClick }: WorkflowCanvasProps) {
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    const getStatusIcon = (status: WorkflowStatus) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="text-emerald-500" size={16} />;
            case 'current': return <Play className="text-primary animate-pulse" size={16} />;
            case 'failed': return <AlertCircle className="text-destructive" size={16} />;
            default: return <Clock className="text-muted-foreground" size={16} />;
        }
    };

    return (
        <div className={cn("relative w-full h-[600px] bg-white dark:bg-slate-900 border rounded-[3rem] overflow-hidden group/canvas", className)}>
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            {/* SVG Container for Edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-muted-foreground/30" />
                    </marker>
                </defs>
                {edges.map(edge => {
                    const fromNode = nodes.find(n => n.id === edge.from);
                    const toNode = nodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    // Simple path calculation (can be improved with Bezier)
                    const isCurrentPath = fromNode.status === 'completed' && toNode.status === 'current';

                    return (
                        <g key={edge.id} className="transition-all duration-700">
                            <path
                                d={`M ${fromNode.position.x + 100} ${fromNode.position.y + 40}
                     C ${fromNode.position.x + 160} ${fromNode.position.y + 40},
                       ${toNode.position.x - 60} ${toNode.position.y + 40},
                       ${toNode.position.x} ${toNode.position.y + 40}`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={isCurrentPath ? 3 : 2}
                                className={cn(
                                    "transition-all duration-1000",
                                    isCurrentPath ? "text-primary stroke-dasharray-[8] animate-dash" : "text-muted-foreground/20"
                                )}
                                style={{
                                    strokeDasharray: isCurrentPath ? '8' : 'none',
                                    filter: isCurrentPath ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none'
                                }}
                                markerEnd="url(#arrowhead)"
                            />
                            {edge.label && (
                                <text
                                    x={(fromNode.position.x + toNode.position.x + 100) / 2}
                                    y={((fromNode.position.y + toNode.position.y) / 2) + 35}
                                    className="text-[9px] font-black fill-muted-foreground/60 uppercase tracking-widest text-center"
                                >
                                    {edge.label}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Nodes Layer */}
            <div className="relative w-full h-full p-10">
                {nodes.map(node => (
                    <div
                        key={node.id}
                        className={cn(
                            "absolute w-56 p-5 rounded-3xl border-2 transition-all duration-500 cursor-pointer flex flex-col gap-3 group/node",
                            node.status === 'current' ? "bg-card border-primary shadow-[0_20px_40px_rgba(59,130,246,0.15)] scale-105" :
                                node.status === 'completed' ? "bg-emerald-50 border-emerald-500/20 shadow-sm" :
                                    "bg-card border-muted opacity-100 hover:scale-105 transition-all"
                        )}
                        style={{ left: node.position.x, top: node.position.y }}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => onNodeClick?.(node)}
                    >
                        <div className="flex items-center justify-between">
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                node.status === 'current' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {node.type}
                            </span>
                            {getStatusIcon(node.status)}
                        </div>

                        <p className="text-sm font-black text-foreground tracking-tight leading-tight">
                            {node.label}
                        </p>

                        {node.assignee && (
                            <div className="flex items-center gap-2 pt-2 border-t border-muted/50 mt-1">
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User size={10} />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground">{node.assignee}</span>
                            </div>
                        )}

                        {/* Hover Actions */}
                        <div className={cn(
                            "absolute top-2 -right-12 flex flex-col gap-2 transition-all",
                            hoveredNode === node.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
                        )}>
                            <button className="p-2 bg-card border rounded-full shadow-lg text-muted-foreground hover:text-primary transition-colors">
                                <MoreVertical size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Canvas UI Overlays */}
            <div className="absolute bottom-8 left-8 p-6 bg-card border shadow-2xl space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Workflow Intelligence</h4>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> In Progress
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-muted" /> Scheduled
                    </div>
                </div>
            </div>
        </div>
    );
}