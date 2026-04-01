'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { FormField } from '@/app/components/ui/standard-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Plus,
    Network as NetworkIcon,
    Server,
    Activity,
    Shield,
    Cpu,
    Settings,
    Trash2,
    Search,
    Zap,
    Globe,
    Database,
    Radio
} from 'lucide-react';
import type { Network } from '@/services/foundation/system/NetworkAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
    saveNetworkAction as saveNetworkNodeAction,
    deleteNetworkAction as deleteNetworkNodeAction
} from '@/app/actions/networkActions';

interface NetworkAdminClientProps {
    initialNetworks: Network[];
}

export default function NetworkAdminClient({ initialNetworks }: NetworkAdminClientProps) {
    const { toast } = useToast();
    const confirm = useConfirm();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<Network | null>(null);

    const filteredNodes = initialNetworks.filter(node =>
        (node.manageIem?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (node.ntwrkId?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const handleCreate = () => {
        setEditingNode(null);
        setIsOpen(true);
    };

    const handleEdit = (node: Network) => {
        setEditingNode(node);
        setIsOpen(true);
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: '?명봽님노드 ?곴뎄 님젣',
            message: '?좏깮님?ㅽ듃?뚰겕 노드瑜님쒖뒪?쒖뿉님제거?섏떆寃좎뒿?덇퉴? 님?묒뾽? ?섎룎由님님놁쑝硫?愿님?곌껐님利됱떆 李⑤떒?⑸땲님',
            variant: 'destructive',
            confirmText: '노드 제거 ?뱀씤'
        });

        if (ok) {
            try {
                const res = await deleteNetworkNodeAction(id);
                if (res.success) {
                    toast(res.message, 'success');
                } else {
                    toast(res.message, 'error');
                }
            } catch {
                toast('님젣 以님쒖뒪님?뺤? ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        try {
            const res = await saveNetworkNodeAction(null, formData);

            if (res.success) {
                toast(res.message, 'success');
                setIsOpen(false);
            } else {
                toast(res.message, 'error');
            }
        } catch {
            toast('?곗씠님?좏슚님寃님諛님?μ뿉 ?ㅽ뙣?덉뒿?덈떎.', 'error');
        }
    };

    const columns = [
        {
            header: '?명봽님노드 ID',
            accessor: (item: Network) => (
                <div className="flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Cpu size={18} />
                    </div>
                    <div>
                        <span className="font-black tracking-tighter text-foreground block text-sm uppercase leading-none">{item.ntwrkId}</span>
                        <span className="text-[8px] font-black text-muted-foreground tracking-[0.3em] mt-1.5 uppercase opacity-40">INFRA_NODE_UUID</span>
                    </div>
                </div>
            )
        },
        {
            header: '?ㅽ듃?뚰겕 ?먯궛 ?뺣낫',
            accessor: (item: Network) => (
                <div className="space-y-1">
                    <span className="text-sm font-black text-foreground uppercase tracking-tight">{item.manageIem}</span>
                    <div className="flex items-center gap-2">
                        <Globe size={10} className="text-primary opacity-40" />
                        <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums lowercase">{item.ntwrkIp}</span>
                    </div>
                </div>
            )
        },
        {
            header: '?댁쁺 ?곹깭',
            accessor: (item: Network) => <HubStatusBadge status={item.useAt === 'Y' ? '?뺤긽 ?댁쁺' : '?댁쁺 以묒?'} />,
            className: 'w-32'
        },
        {
            header: '愿由님꾩슜',
            className: 'text-right w-32',
            accessor: (item: Network) => (
                <div className="flex justify-end gap-2 pr-4">
                    <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl border border-slate-200 transition-all font-black" onClick={() => handleEdit(item)}>
                        <Settings size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all" onClick={() => handleDelete(item.ntwrkId)}>
                        <Trash2 size={16} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader title="?ㅽ듃?뚰겕 ?좏뤃濡쒖? 愿由? breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '?ㅽ듃?뚰겕 愿由? }]} />

            <HubHeader
                title="?명봽님
                highlight="?ㅽ듃?뚰겕 노드 愿由?
                subtitle="?꾩궗 ?쒕퉬님노드님IP ?좊떦 ?뺤콉, 寃뚯씠?몄썾님諛님쒕툕님援ъ꽦님臾쇰━?곸쑝濡?매핑?섏뿬 愿由ы빀?덈떎."
                icon={NetworkIcon}
                actions={
                    <Button onClick={handleCreate} size="lg" className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-2">
                        <Plus size={18} /> 신규 노드 등록
                    </Button>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="愿由님님노드" value={initialNetworks.length} icon={Server} color="primary" />
                <HubMetricCard title="?좊떦 怨좎젙 IP" value={initialNetworks.filter(n => n.ntwrkIp).length} icon={Database} color="emerald" status="?덉쟾" />
                <HubMetricCard title="?ㅽ듃?뚰겕 媛?⑹꽦" value="99.9%" icon={Activity} color="amber" />
                <HubMetricCard title="?됯퇏 ?묐떟 ?띾룄" value="4ms" icon={Zap} color="indigo" />
            </HubMetricGrid>

            <HubSectionCard title="?명봽님노드 ?먯깋湲? description="?쒖뒪?쒖뿉 등록님紐⑤뱺 媛님諛?臾쇰━ ?ㅽ듃?뚰겕 ?붾뱶?ъ씤?몄쓽 以묒븰 吏묒쨷님愿님紐⑸줉?낅땲님" icon={Database}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                        <div className="relative group/search flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                            <Input
                                placeholder="노드 紐낆묶 ?먮뒗 ID 湲곕컲 吏?ν삎 寃님.."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-16 pl-16 pr-8 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-black text-md tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <StandardDataTable columns={columns} data={filteredNodes} emptyMessage="조회님?ㅽ듃?뚰겕 ?먯궛님?놁뒿?덈떎." className="border-none bg-transparent" />
            </HubSectionCard>

            <StandardModal
                isOpen={isModalOpen}
                onClose={() => setIsOpen(false)}
                title={editingNode ? '?명봽님노드 援ъ꽦 ?몄쭛' : '신규 ?ㅽ듃?뚰겕 노드 ?꾨줈鍮꾩님?}
                maxWidth="3xl"
                footer={
                    <div className="flex w-full gap-4">
                        <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">痍⑥냼</Button>
                        <Button form="network-form" type="submit" className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 group">
                            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> {editingNode ? '援ъ꽦 蹂寃님ы빆 ?곸슜' : '?명봽님?곌껐 활성님}
                        </Button>
                    </div>
                }
            >
                <form id="network-form" onSubmit={handleSubmit} className="space-y-10 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                            <FormField label="?명봽님노드 ?앸퀎님(NODE_ID)" required description="?쒖뒪?쒖뿉님怨좎쑀?섍쾶 ?몄떇?섎뒗 ID?낅땲님">
                                <Input
                                    name="ntwrkId"
                                    defaultValue={editingNode?.ntwrkId}
                                    required
                                    readOnly={!!editingNode}
                                    className="h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 font-mono text-sm font-black shadow-inner"
                                    placeholder="EX: NODE-SVR-01"
                                />
                            </FormField>
                            <FormField label="노드 ?먯궛 蹂꾩묶 (Alias)" required>
                                <Input
                                    name="manageIem"
                                    defaultValue={editingNode?.manageIem}
                                    required
                                    className="h-14 rounded-2xl text-md font-black tracking-tight shadow-inner"
                                    placeholder="?ㅽ듃?뚰겕 노드 ?대쫫 ?낅젰"
                                />
                            </FormField>
                            <FormField label="IP ?붾뱶?ъ씤님二쇱냼" required>
                                <div className="relative group/ip">
                                    <Globe size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/ip:opacity-100 transition-opacity" />
                                    <Input
                                        name="ntwrkIp"
                                        defaultValue={editingNode?.ntwrkIp}
                                        required
                                        className="h-14 pl-16 rounded-2xl font-mono text-xs font-black shadow-inner"
                                        placeholder="0.0.0.0"
                                    />
                                </div>
                            </FormField>
                        </div>

                        <div className="space-y-8">
                            <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white space-y-6 shadow-2xl relative overflow-hidden group">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Radio size={18} className="text-primary animate-pulse" />
                                        <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40">?댁쁺 ?꾨줈?좎퐳 ?쒖뼱</span>
                                    </div>
                                    <FormField label="노드 ?댁쁺 ?곹깭 활성님>
                                        <div className="grid grid-cols-1 gap-4 mt-4">
                                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group/choice">
                                                <input
                                                    type="radio"
                                                    name="useAt"
                                                    value="Y"
                                                    defaultChecked={editingNode?.useAt !== 'N'}
                                                    id="status-active"
                                                    className="w-5 h-5 accent-primary"
                                                />
                                                <label htmlFor="status-active" className="flex flex-col cursor-pointer">
                                                    <span className="text-xs font-black uppercase tracking-widest">?명봽님?곌껐 활성님/span>
                                                    <span className="text-[9px] font-bold text-white/30 lowercase mt-1">?쇱씠釉님명봽님援ъ텞</span>
                                                </label>
                                            </div>
                                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group/choice">
                                                <input
                                                    type="radio"
                                                    name="useAt"
                                                    value="N"
                                                    defaultChecked={editingNode?.useAt === 'N'}
                                                    id="status-inactive"
                                                    className="w-5 h-5 accent-rose-500"
                                                />
                                                <label htmlFor="status-inactive" className="flex flex-col cursor-pointer">
                                                    <span className="text-xs font-black uppercase tracking-widest text-rose-500">노드 ?댁쁺 以묒?</span>
                                                    <span className="text-[9px] font-bold text-white/30 lowercase mt-1">?고쉶 鍮꾪솢?깊솕</span>
                                                </label>
                                            </div>
                                        </div>
                                    </FormField>
                                </div>
                                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </form>
            </StandardModal>
        </div>
    );
}

