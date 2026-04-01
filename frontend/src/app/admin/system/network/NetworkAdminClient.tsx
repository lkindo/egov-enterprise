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
            title: '?∏ÌîÑ???∏Îìú ?ÅÍµ¨ ??†ú',
            message: '?†ÌÉù???§Ìä∏?åÌÅ¨ ?∏ÎìúÎ•??úÏä§?úÏóê???úÍ±∞?òÏãúÍ≤†Ïäµ?àÍπå? ???ëÏóÖ?Ä ?òÎèåÎ¶????ÜÏúºÎ©?Í¥Ä???∞Í≤∞??Ï¶âÏãú Ï∞®Îã®?©Îãà??',
            variant: 'destructive',
            confirmText: '?∏Îìú ?úÍ±∞ ?πÏù∏'
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
<<<<<<< HEAD
                toast('ÏÇ≠Ï†ú Ï§ë ÏãúÏä§ÌÖú Ï†ïÏßÄ Ïò§Î•òÍ∞Ä Î∞úÏÉùÌñàÏäµÎãàÎã§.', 'error');
=======
                toast('??†ú Ï§??úÏä§???ïÏ? ?§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.', 'error');
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f
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
<<<<<<< HEAD
            toast('Îç∞Ïù¥ÌÑ∞ Ïú†Ìö®ÏÑ± Í≤ÄÏÇ¨ Î∞è Ï†ÄÏû•Ïóê Ïã§Ìå®ÌñàÏäµÎãàÎã§.', 'error');
=======
            toast('?∞Ïù¥???†Ìö®??Í≤Ä??Î∞??Ä?•Ïóê ?§Ìå®?àÏäµ?àÎã§.', 'error');
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f
        }
    };

    const columns = [
        {
            header: '?∏ÌîÑ???∏Îìú ID',
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
            header: '?§Ìä∏?åÌÅ¨ ?êÏÇ∞ ?ïÎ≥¥',
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
            header: '?¥ÏòÅ ?ÅÌÉú',
            accessor: (item: Network) => <HubStatusBadge status={item.useAt === 'Y' ? '?ïÏÉÅ ?¥ÏòÅ' : '?¥ÏòÅ Ï§ëÏ?'} />,
            className: 'w-32'
        },
        {
            header: 'Í¥ÄÎ¶??ÑÏö©',
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
            <PageHeader title="?§Ìä∏?åÌÅ¨ ?†Ìè¥Î°úÏ? Í¥ÄÎ¶? breadcrumbs={[{ label: '?úÏä§?úÍ?Î¶? }, { label: '?§Ìä∏?åÌÅ¨ Í¥ÄÎ¶? }]} />

            <HubHeader
                title="?∏ÌîÑ??
                highlight="?§Ìä∏?åÌÅ¨ ?∏Îìú Í¥ÄÎ¶?
                subtitle="?ÑÏÇ¨ ?úÎπÑ???∏Îìú??IP ?†Îãπ ?ïÏ±Ö, Í≤åÏù¥?∏Ïõ®??Î∞??úÎ∏å??Íµ¨ÏÑ±??Î¨ºÎ¶¨?ÅÏúºÎ°?Îß§Ìïë?òÏó¨ Í¥ÄÎ¶¨Ìï©?àÎã§."
                icon={NetworkIcon}
                actions={
                    <Button onClick={handleCreate} size="lg" className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-2">
                        <Plus size={18} /> ?†Í∑ú ?∏Îìú ?±Î°ù
                    </Button>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="Í¥ÄÎ¶??Ä???∏Îìú" value={initialNetworks.length} icon={Server} color="primary" />
                <HubMetricCard title="?†Îãπ Í≥†Ï†ï IP" value={initialNetworks.filter(n => n.ntwrkIp).length} icon={Database} color="emerald" status="?àÏ†Ñ" />
                <HubMetricCard title="?§Ìä∏?åÌÅ¨ Í∞Ä?©ÏÑ±" value="99.9%" icon={Activity} color="amber" />
                <HubMetricCard title="?âÍ∑† ?ëÎãµ ?çÎèÑ" value="4ms" icon={Zap} color="indigo" />
            </HubMetricGrid>

            <HubSectionCard title="?∏ÌîÑ???∏Îìú ?êÏÉâÍ∏? description="?úÏä§?úÏóê ?±Î°ù??Î™®Îì† Í∞Ä??Î∞?Î¨ºÎ¶¨ ?§Ìä∏?åÌÅ¨ ?îÎìú?¨Ïù∏?∏Ïùò Ï§ëÏïô ÏßëÏ§ë??Í¥Ä??Î™©Î°ù?ÖÎãà??" icon={Database}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                        <div className="relative group/search flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                            <Input
                                placeholder="?∏Îìú Î™ÖÏπ≠ ?êÎäî ID Í∏∞Î∞ò ÏßÄ?•Ìòï Í≤Ä??.."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-16 pl-16 pr-8 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-black text-md tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <StandardDataTable columns={columns} data={filteredNodes} emptyMessage="Ï°∞Ìöå???§Ìä∏?åÌÅ¨ ?êÏÇ∞???ÜÏäµ?àÎã§." className="border-none bg-transparent" />
            </HubSectionCard>

            <StandardModal
                isOpen={isModalOpen}
                onClose={() => setIsOpen(false)}
                title={editingNode ? '?∏ÌîÑ???∏Îìú Íµ¨ÏÑ± ?∏Ïßë' : '?†Í∑ú ?§Ìä∏?åÌÅ¨ ?∏Îìú ?ÑÎ°úÎπÑÏ???}
                maxWidth="3xl"
                footer={
                    <div className="flex w-full gap-4">
                        <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">Ï∑®ÏÜå</Button>
                        <Button form="network-form" type="submit" className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 group">
                            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> {editingNode ? 'Íµ¨ÏÑ± Î≥ÄÍ≤??¨Ìï≠ ?ÅÏö©' : '?∏ÌîÑ???∞Í≤∞ ?úÏÑ±??}
                        </Button>
                    </div>
                }
            >
                <form id="network-form" onSubmit={handleSubmit} className="space-y-10 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                            <FormField label="?∏ÌîÑ???∏Îìú ?ùÎ≥Ñ??(NODE_ID)" required description="?úÏä§?úÏóê??Í≥†Ïú†?òÍ≤å ?∏Ïãù?òÎäî ID?ÖÎãà??">
                                <Input
                                    name="ntwrkId"
                                    defaultValue={editingNode?.ntwrkId}
                                    required
                                    readOnly={!!editingNode}
                                    className="h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 font-mono text-sm font-black shadow-inner"
                                    placeholder="EX: NODE-SVR-01"
                                />
                            </FormField>
                            <FormField label="?∏Îìú ?êÏÇ∞ Î≥ÑÏπ≠ (Alias)" required>
                                <Input
                                    name="manageIem"
                                    defaultValue={editingNode?.manageIem}
                                    required
                                    className="h-14 rounded-2xl text-md font-black tracking-tight shadow-inner"
                                    placeholder="?§Ìä∏?åÌÅ¨ ?∏Îìú ?¥Î¶Ñ ?ÖÎ†•"
                                />
                            </FormField>
                            <FormField label="IP ?îÎìú?¨Ïù∏??Ï£ºÏÜå" required>
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
                                        <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40">?¥ÏòÅ ?ÑÎ°ú?†ÏΩú ?úÏñ¥</span>
                                    </div>
                                    <FormField label="?∏Îìú ?¥ÏòÅ ?ÅÌÉú ?úÏÑ±??>
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
                                                    <span className="text-xs font-black uppercase tracking-widest">?∏ÌîÑ???∞Í≤∞ ?úÏÑ±??/span>
                                                    <span className="text-[9px] font-bold text-white/30 lowercase mt-1">?ºÏù¥Î∏??∏ÌîÑ??Íµ¨Ï∂ï</span>
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
                                                    <span className="text-xs font-black uppercase tracking-widest text-rose-500">?∏Îìú ?¥ÏòÅ Ï§ëÏ?</span>
                                                    <span className="text-[9px] font-bold text-white/30 lowercase mt-1">?∞Ìöå ÎπÑÌôú?±Ìôî</span>
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
