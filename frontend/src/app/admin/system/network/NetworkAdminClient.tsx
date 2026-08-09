'use client';

import { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NetworkForm } from '@/components/admin/system/NetworkForm';
import { Plus, 
    Network as NetworkIcon, 
    Server, 
    Activity, 
    Cpu, 
    Settings, 
    Trash2, 
    Search, 
    Zap, 
    Globe, 
    Database } from 'lucide-react';
import type { Network } from '@/services/foundation/system/NetworkAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useRouter } from 'next/navigation';
import {
    saveNetworkAction as saveNetworkNodeAction,
    deleteNetworkAction as deleteNetworkNodeAction
} from '@/app/actions/networkActions';

interface NetworkAdminClientProps {
    initialNetworks: Network[];
    /** 서버 컴포넌트 조회 실패 사유(성공 시 null). 빈 목록 위장 방지용(P1-1). */
    fetchError?: string | null;
}

export default function NetworkAdminClient({ initialNetworks, fetchError = null }: NetworkAdminClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const confirm = useConfirm();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<Network | null>(null);

    // 검색은 서버 요청이 아니라 이미 내려받은 목록의 클라이언트 필터라 디바운스가 불필요하다.
    const nodes = (initialNetworks || []).filter(Boolean);
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const filteredNodes = nodes.filter(node => (
        String(node.manageIem || '').toLowerCase().includes(normalizedTerm) ||
        String(node.ntwrkId || '').toLowerCase().includes(normalizedTerm)
    ));

    const listError = fetchError ? new Error(fetchError) : null;

    /**
     * [W0-P0-6 보완] 백엔드 쓰기 경로가 **미구현(501)** 이다.
     *
     * Wave 0 은 `NetworkMonitoringApiController` 의 POST/PUT/DELETE 를 "저장 없이 200" 에서
     * 501 로 정직하게 바꿨다(그 전에는 저장되지 않았는데 성공 토스트가 떴다). 그런데 화면은
     * 그대로여서, 사용자는 '신규 노드 등록' 을 누르고 폼을 전부 채운 **뒤에야** 501 을 만난다.
     * 로드맵이 요구한 것은 "서비스 구현 또는 제거 중 택1, **유지 시 배너 + 버튼 disabled**" 였다.
     * 실패를 늦게 알리는 것은 정직해진 것이 아니라 실패 지점만 뒤로 민 것이다.
     *
     * 백엔드가 구현되면 이 상수 하나를 false 로 바꾸면 된다(그리고 이 주석을 지운다).
     */
    const WRITE_NOT_IMPLEMENTED = true;
    const writeDisabledReason = '백엔드 저장 기능이 아직 구현되지 않았습니다 (서버가 501을 반환합니다).';
    const activeNodeCount = nodes.filter(n => n.useYn === 'Y').length;
    const inactiveNodeCount = nodes.length - activeNodeCount;
    const assignedIpCount = nodes.filter(n => n.ntwrkIp).length;

    const handleCreate = () => {
        setEditingNode(null);
        setIsOpen(true);
    };

    const handleEdit = (node: Network) => {
        setEditingNode(node);
        setIsOpen(true);
    };

    const handleDelete = async (node: Network) => {
        // 파괴적 액션 확인 본문에는 반드시 대상 식별자(노드명/ID)를 노출한다(P1-9).
        const label = node.manageIem || node.ntwrkId || '알 수 없는 노드';
        const ok = await confirm({
            title: '인프라 노드 영구 삭제',
            message: `"${label}"(ID: ${node.ntwrkId}) 노드를 시스템에서 제거하시겠습니까? 이 작업은 되돌릴 수 없으며 관련 연결이 즉시 차단됩니다.`,
            variant: 'destructive',
            confirmText: '자산 삭제'
        });

        if (ok) {
            try {
                const res = await deleteNetworkNodeAction(node.ntwrkId);
                if (res.success) {
                    toast(res.message, 'success');
                    router.refresh();
                } else {
                    toast(res.message, 'error');
                }
            } catch (error) {
                const message = error instanceof Error && error.message ? error.message : '';
                toast(message || '삭제 중 시스템 오류가 발생했습니다.', 'error');
            }
        }
    };

    const columns = [
        {
            header: '인프라 노드 ID',
            accessor: (item: Network) => (
                <div className="flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg group-hover:scale-110 transition-transform">
                        <Cpu size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-bold tracking-tighter text-foreground block text-sm uppercase leading-none">{item?.ntwrkId}</span>
                        <span className="text-xs font-bold text-muted-foreground tracking-[0.3em] mt-1.5 uppercase opacity-40">INFRA_NODE_UUID</span>
                    </div>
                </div>
            )
        },
        {
            header: '네트워크 자산 정보',
            accessor: (item: Network) => (
                <div className="space-y-1 text-left">
                    <span className="text-sm font-bold text-foreground uppercase tracking-tight">{item?.manageIem}</span>
                    <div className="flex items-center gap-2">
                        <Globe size={10} className="text-primary opacity-40" />
                        <span className="text-xs font-bold text-muted-foreground/60 tabular-nums lowercase">{item?.ntwrkIp}</span>
                    </div>
                </div>
            )
        },
        {
            header: '운영 상태',
            accessor: (item: Network) => (
                <HubStatusBadge 
                    label={item.useYn === 'Y' ? '정상 운영' : '운영 중지'} 
                    variant={item.useYn === 'Y' ? 'success' : 'secondary'} 
                />
            ),
            className: 'w-32'
        },
        {
            header: '관리 조정',
            className: 'text-right w-32',
            accessor: (item: Network) => (
                <div className="flex justify-end gap-2 pr-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={WRITE_NOT_IMPLEMENTED}
                        title={WRITE_NOT_IMPLEMENTED ? writeDisabledReason : undefined}
                        aria-label={`${item.manageIem || item.ntwrkId} 노드 수정${WRITE_NOT_IMPLEMENTED ? ' (미구현)' : ''}`}
                        className="h-10 w-10 bg-muted hover:bg-surface-inverse hover:text-surface-inverse-foreground rounded-lg border border-border transition-all font-bold"
                        onClick={() => handleEdit(item)}
                    >
                        <Settings size={16} aria-hidden="true" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={WRITE_NOT_IMPLEMENTED}
                        title={WRITE_NOT_IMPLEMENTED ? writeDisabledReason : undefined}
                        aria-label={`${item.manageIem || item.ntwrkId} 노드 삭제${WRITE_NOT_IMPLEMENTED ? ' (미구현)' : ''}`}
                        className="h-10 w-10 text-destructive-emphasis bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 rounded-lg transition-all"
                        onClick={() => handleDelete(item)}
                    >
                        <Trash2 size={16} aria-hidden="true" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader 
                title="네트워크 토폴로지 관리" 
                breadcrumbs={[{ label: '시스템관리' }, { label: '네트워크 관리' }]} 
            />

            <HubHeader
                title="인프라"
                highlight="네트워크 노드 관리"
                subtitle="전사 서비스 노드의 IP 할당 정책, 게이트웨이 및 서브넷 구성을 물리적으로 매핑하여 관리합니다."
                icon={NetworkIcon}
                actions={
                    <Button
                        onClick={handleCreate}
                        size="lg"
                        disabled={WRITE_NOT_IMPLEMENTED}
                        title={WRITE_NOT_IMPLEMENTED ? writeDisabledReason : undefined}
                        className="h-11 px-10 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-2"
                    >
                        <Plus size={18} /> 신규 노드 등록
                    </Button>
                }
            />

            {/*
              [W0-P0-6 보완] 쓰기 미구현 사실을 **작업을 시작하기 전에** 알린다.
              role="status" 로 보조기술에도 전달한다(경고가 아니라 상태 고지이므로 alert 가 아니다).
            */}
            {WRITE_NOT_IMPLEMENTED && (
                <div
                    role="status"
                    className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-5 py-4"
                >
                    {/* 아이콘은 장식이라 색으로 정보를 전달하지 않는다. `text-warning-emphasis` 같은
                        미정의 토큰을 쓰면 Tailwind 가 클래스를 만들지 않아 색이 조용히 사라진다
                        (globals.css 에 정의된 emphasis 토큰은 --destructive-emphasis 하나뿐이다). */}
                    <Settings size={18} className="mt-0.5 shrink-0 text-foreground" aria-hidden="true" />
                    <div className="text-sm leading-relaxed">
                        <strong className="font-bold">조회 전용 화면입니다.</strong>{' '}
                        네트워크 노드의 등록·수정·삭제는 <strong>백엔드가 아직 구현하지 않았습니다</strong>
                        (서버가 <code className="rounded bg-muted px-1 py-0.5 text-xs">501 Not Implemented</code> 를 반환합니다).
                        아래 목록은 실제 저장된 데이터이며, 값이 없으면 등록된 노드가 없다는 뜻입니다 —
                        조회 실패가 빈 목록으로 위장되지는 않습니다.
                    </div>
                </div>
            )}

            {/*
              [P1-5] '네트워크 가용성 99.9%' / '평균 응답 속도 4ms' 카드 삭제.
              두 값 모두 어떤 계측 소스도 없는 고정 문자열이라 운영 판단 근거가 될 수 없었다.
              대신 목록에서 실제 산출 가능한 운영/중지 노드 수로 대체한다.
            */}
            <HubMetricGrid>
                <HubMetricCard title="관리 대상 노드" value={nodes.length} icon={Server} color="primary" status="등록 건수" />
                <HubMetricCard title="운영 중 노드" value={activeNodeCount} icon={Activity} color="emerald" status="useYn=Y" />
                <HubMetricCard title="운영 중지 노드" value={inactiveNodeCount} icon={Zap} color="amber" status="useYn=N" />
                <HubMetricCard title="IP 할당 노드" value={assignedIpCount} icon={Database} color="indigo" status="IP 보유" />
            </HubMetricGrid>

            <HubSectionCard 
                title="인프라 노드 검색기" 
                description="시스템에 등록된 모든 가상 및 물리 네트워크 엔드포인트의 중앙 집중 관리 목록입니다." 
                icon={Database}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
                    <div className="flex flex-col md:flex-row gap-4 flex-1 text-left">
                        <div className="relative group/search flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                            <Input
                                placeholder="노드 명칭 또는 ID 기반 지형 검색.."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-11 pl-16 pr-8 rounded-lg bg-muted border-2 border-border font-bold text-md tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <StandardDataTable
                    columns={columns}
                    data={filteredNodes}
                    keyField="ntwrkId"
                    error={listError}
                    onRetry={() => router.refresh()}
                    emptyMessage="조회된 네트워크 자산이 없습니다."
                    className="border-none bg-transparent"
                />
            </HubSectionCard>

            <StandardModal
                isOpen={isModalOpen}
                onClose={() => setIsOpen(false)}
                title={editingNode ? '인프라 노드 구성 편집' : '신규 네트워크 노드 프로비저닝'}
                maxWidth="3xl"
            >
                <div className="pt-4 text-left">
                    <NetworkForm 
                        initialData={editingNode || {}} 
                        onCancel={() => setIsOpen(false)}
                        onSubmit={async (values) => {
                            try {
                                const formData = new FormData();
                                Object.entries(values).forEach(([key, value]) => {
                                    if (value !== undefined) formData.append(key, String(value));
                                });
                                
                                const res = await saveNetworkNodeAction(null, formData);
                                if (res.success) {
                                    toast(res.message, 'success');
                                    setIsOpen(false);
                                    // 전체 새로고침(window.location.reload)은 검색어·스크롤을 날리고 깜빡임을 만든다.
                                    // 서버 컴포넌트 데이터만 재요청하도록 router.refresh() 에 위임한다.
                                    router.refresh();
                                } else {
                                    toast(res.message, 'error');
                                }
                            } catch (error) {
                                const message = error instanceof Error && error.message ? error.message : '';
                                toast(message || '데이터 유효성 검증 및 반영에 실패했습니다.', 'error');
                            }
                        }}
                    />
                </div>
            </StandardModal>
        </div>
    );
}
