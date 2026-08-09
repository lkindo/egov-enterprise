'use client';

// [데모 스캐폴드] /admin/workflow 'Process Studio'는 정적 목업이다(하드코딩 노드/지표, 백엔드 미연동 — fetch/service 0건).
// 실제 전자결재(승인/반려) 기능은 별도 경로에 백엔드 연동되어 동작한다:
//   FE /approvals(ApprovalHubClient)·/admin/system/ism(IsmClient) ↔ BE /api/v1/approvals·/api/v1/admin/system/ism ↔ InformalSanction(tb_ifml_atrz_info).
// 신규 SI에서 워크플로우 엔진이 필요하면 대응 백엔드(컨트롤러/서비스/테이블)를 신설해 이 화면에 배선할 것.
import { useState } from 'react';
import { GitBranch,
    History,
    Plus,
    CheckCircle2,
    Clock,
    Layers,
    Zap,
    Activity,
    RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowCanvas, WorkflowNode, WorkflowEdge } from '@/app/components/ui/workflow-canvas';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { PageHeader } from '@/app/components/layout/page-header';
import { Button } from '@/components/ui/button';

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

export default function WorkflowClient() {
    const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(MOCK_WORKFLOW_NODES[2]);

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader
                title="프로세스 설계 및 관제"
                breadcrumbs={[{ label: '워크플로우' }, { label: '스튜디오' }]}
            />

            <HubHeader
                title="Process"
                highlight="Studio"
                subtitle="실시간 이벤트 기반 워크플로우를 설계하고 비즈니스 로직을 시각화합니다."
                icon={GitBranch}
                actions={
                    <div className="flex gap-4">
                        <Button variant="outline" className="h-11 px-8 rounded-xl bg-white border-2 border-border text-muted-foreground hover:text-primary transition-all shadow-sm">
                            <History size={18} /> 히스토리
                        </Button>
                        <Button className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
                            <Plus size={20} /> 설계 등록
                        </Button>
                    </div>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="활성 설계" value="24" icon={Layers} color="primary" />
                <HubMetricCard title="실행 중" value="156" icon={Zap} color="emerald" status="정상" />
                <HubMetricCard title="성공률" value="99.9%" icon={CheckCircle2} color="indigo" />
                <HubMetricCard title="시스템 부하" value="LOW" icon={Activity} color="amber" />
            </HubMetricGrid>

            <div className="grid grid-cols-12 gap-10">
                <div className="col-span-12 lg:col-span-8">
                    <HubSectionCard
                        title="프로세스 캔버스"
                        description="현재 활성화된 비즈니스 프로세스의 노드 및 엣지 스트림입니다."
                        icon={Layers}
                        className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
                    >
                        <div className="space-y-6 pt-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Active_Process:</span>
                                    <span className="text-sm font-bold text-foreground">연차/휴가 결재 v1.2</span>
                                </div>
                                <Button variant="ghost" size="icon" aria-label="프로세스 캔버스 새로고침" className="h-8 w-8 rounded-lg">
                                    <RefreshCcw size={14} className="text-muted-foreground" />
                                </Button>
                            </div>
                            <WorkflowCanvas
                                nodes={MOCK_WORKFLOW_NODES}
                                edges={MOCK_WORKFLOW_EDGES}
                                onNodeClick={setSelectedNode}
                            />
                        </div>
                    </HubSectionCard>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <HubSectionCard
                        title="노드 인텔리전스"
                        description="선택된 단계의 상세 전송 프로토콜입니다."
                        icon={Zap}
                        className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5 h-full"
                    >
                        {selectedNode ? (
                            <div className="space-y-8 py-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="space-y-4">
                                    <div className={cn(
                                        "w-14 h-11 rounded-xl flex items-center justify-center shadow-lg",
                                        selectedNode.status === 'current' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {selectedNode.status === 'completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold tracking-tighter text-foreground">{selectedNode.label}</h4>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">ID: {selectedNode.id} / TYPE: {selectedNode.type}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Assignee_Node</span>
                                        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {selectedNode.assignee?.charAt(0) || 'U'}
                                            </div>
                                            <span className="text-sm font-bold text-foreground">{selectedNode.assignee || 'UNASSIGNED'}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Audit_Log</span>
                                        <div className="space-y-4 border-l-2 border-border ml-2 pl-6 pt-2">
                                            <div className="relative">
                                                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-lg bg-emerald-500 border-4 border-white shadow-sm" />
                                                <p className="text-xs font-bold text-foreground">Protocol Received</p>
                                                <p className="text-[10px] text-muted-foreground font-bold tabular-nums">2026.05.10 14:20:01</p>
                                            </div>
                                            <div className="relative opacity-50">
                                                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-lg bg-muted border-4 border-white shadow-sm" />
                                                <p className="text-xs font-bold text-muted-foreground">Queue Synchronizing</p>
                                                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Waiting...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button className="w-full h-12 bg-surface-inverse hover:bg-primary text-surface-inverse-foreground rounded-xl font-bold text-xs tracking-widest uppercase shadow-2xl transition-all">
                                    Execute Action
                                </Button>
                            </div>
                        ) : (
                            <div className="py-20 text-center opacity-20">
                                <GitBranch size={48} className="mx-auto mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest">Select Node to Analyze</p>
                            </div>
                        )}
                    </HubSectionCard>
                </div>
            </div>
        </div>
    );
}
