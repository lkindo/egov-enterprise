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
    { id: '1', type: 'start', label: '휴가 신청 시작됨', status: 'completed', position: { x: 50, y: 100 } },
    { id: '2', type: 'step', label: '신청서 작성 및 제출', assignee: '홍길동 (신청자)', status: 'completed', position: { x: 300, y: 100 } },
    { id: '3', type: 'decision', label: '팀장 검토 및 승인', assignee: '이순신 (팀장)', status: 'current', position: { x: 550, y: 100 } },
    { id: '4', type: 'step', label: '인사과 최종 확정', assignee: '강감찬 (인사팀)', status: 'pending', position: { x: 800, y: 300 } },
    { id: '5', type: 'end', label: '휴가 승인 프로세스 완료', status: 'pending', position: { x: 1050, y: 300 } },
];

const MOCK_WORKFLOW_EDGES: WorkflowEdge[] = [
    { id: 'e1-2', from: '1', to: '2' },
    { id: 'e2-3', from: '2', to: '3' },
    { id: 'e3-4', from: '3', to: '4', label: '승인됨' },
    { id: 'e4-5', from: '4', to: '5' },
];

export default function WorkflowPage() {
    const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(MOCK_WORKFLOW_NODES[2]);

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 p-8">
            {/* 1. Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <GitBranch size={18} />
                        </div>
                        <span className="text-sm font-bold text-primary tracking-tight">워크플로우 엔진</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground ">
                        Process <span className="text-primary ">Studio</span>
                    </h1>
                    <p className="text-muted-foreground font-bold text-sm max-w-lg">
                        실시간 이벤트 기반 워크플로우 엔진을 통해 비즈니스 프로세스를 설계하고 진행 상태를 시각화합니다.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-3 bg-muted rounded-lg font-bold text-sm tracking-tight hover:bg-muted/80 transition-all">
                        <History size={16} /> 히스토리
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold text-sm tracking-tight shadow-xl hover:bg-primary/90 transition-all">
                        <Plus size={16} /> 신규 워크플로우
                    </button>
                </div>
            </div>

            {/* 2. Main Canvas Area */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-6">
                    <div className="flex items-center justify-between px-6">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground">워크플로우:</span>
                                <span className="text-sm font-bold text-muted-foreground ">연차/휴가 결재 프로세스_v1.2</span>
                            </div>
                            <div className="h-4 w-px bg-muted" />
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-lg bg-emerald-500" />
                                <span className="text-xs font-bold text-muted-foreground ">활성 상태</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-muted rounded-lg transition-colors"><Settings size={14} /></button>
                            <button className="p-2 hover:bg-muted rounded-lg transition-colors"><Search size={14} /></button>
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
                    <div className="p-8 border rounded-lg bg-card shadow-lg space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground tracking-tight">단계 상세 정보</h3>
                            <button className="p-2 hover:bg-muted rounded-lg"><MoreHorizontal size={14} /></button>
                        </div>

                        {selectedNode ? (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                <div className="space-y-4">
                                    <div className={cn(
                                        "w-14 h-11 rounded-lg flex items-center justify-center",
                                        selectedNode.status === 'current' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                    )}>
                                        {selectedNode.status === 'completed' ? <CheckCircle2 size={30} /> : <Clock size={30} />}
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold tracking-tight">{selectedNode.label}</h4>
                                        <p className="text-xs font-bold text-muted-foreground mt-1 tracking-tight">{selectedNode.id} / {selectedNode.type}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-muted-foreground tracking-[0.2em]">현재 담당자</span>
                                        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-white/5">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm ">
                                                {selectedNode.assignee?.charAt(0)}
                                            </div>
                                            <span className="text-sm font-bold">{selectedNode.assignee || '미정'}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-muted-foreground tracking-[0.2em]">처리 로그</span>
                                        <div className="space-y-4 border-l-2 border-muted ml-2 pl-6 pt-2">
                                            <div className="relative">
                                                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-lg bg-emerald-500 border-4 border-background" />
                                                <p className="text-sm font-bold">신청서 수신 완료</p>
                                                <p className="text-xs text-muted-foreground font-bold ">2026-02-22 14:20:01</p>
                                            </div>
                                            <div className="relative opacity-50">
                                                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-lg bg-muted border-4 border-background" />
                                                <p className="text-sm font-bold">대기 열 갱신</p>
                                                <p className="text-xs text-muted-foreground font-bold ">대기 중...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button className="w-full py-5 bg-primary text-white rounded-lg font-bold text-sm tracking-tight shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                    승인 처리하기
                                </button>
                            </div>
                        ) : (
                            <div className="py-20 text-center opacity-30 ">
                                <p className="text-sm font-bold">노드를 선택하여 상세 정보를 확인하세요</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
