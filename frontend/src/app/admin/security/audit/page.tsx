'use client';

import React from 'react';
import { VisualAuditTimeline, AuditLog } from '@/app/components/ui/visual-audit-timeline';
import { PageHeader } from '@/app/components/layout/page-header';
import { ShieldCheck, Lock, Activity, Download, Share2, History as HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MOCK_AUDIT_LOGS: AuditLog[] = [
    {
        id: 'aud-001',
        action: 'UPDATE',
        entityName: 'SYSTEM_CONFIG:AUTH_POLICY',
        performedBy: 'Admin.Kim',
        timestamp: '2026-02-22 23:15:22',
        ipAddress: '192.168.0.101',
        severity: 'high',
        changes: [
            { field: 'PASSWORD_EXPIRY_DAYS', before: '90', after: '30' },
            { field: 'MFA_REQUIRED_GROUPS', before: 'ADMIN', after: 'ALL_USERS' }
        ]
    },
    {
        id: 'aud-002',
        action: 'RESTORE',
        entityName: 'USER_ENTITY:u-9921',
        performedBy: 'System.Sync',
        timestamp: '2026-02-22 22:40:15',
        ipAddress: 'Internal (10.0.0.5)',
        severity: 'medium',
        changes: [
            { field: 'STATUS', before: 'DELETED', after: 'ACTIVE' },
            { field: 'RESTORE_REASON', before: 'N/A', after: 'Accidental Deletion Recovery' }
        ]
    },
    {
        id: 'aud-003',
        action: 'CREATE',
        entityName: 'SECURITY_RULE:FIREWALL_INBOUND',
        performedBy: 'SecOps.Lee',
        timestamp: '2026-02-22 21:05:00',
        ipAddress: '192.168.10.55',
        severity: 'low',
        changes: [
            { field: 'PORT_RESTRICTION', before: 'OPEN', after: 'PORT_443_ONLY' }
        ]
    },
    {
        id: 'aud-004',
        action: 'UPDATE',
        entityName: 'DATABASE_SCHEMA:USER_TABLE',
        performedBy: 'DBA.Park',
        timestamp: '2026-02-22 19:30:11',
        ipAddress: '10.155.22.4',
        severity: 'medium',
        changes: [
            { field: 'COLUMN:PERSONAL_ID', before: 'VARCHAR(20)', after: 'VARBINARY(256) (ENCRYPTED)' }
        ]
    }
];

export default function SecurityAuditPage() {
    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            <PageHeader
                title="보안 감사 타임머신"
                breadcrumbs={[{ label: '시스템 관리' }, { label: '보안 센터' }, { label: '감사 정보' }]}
                actions={
                    <div className="flex gap-3">
                        <Button variant="outline" className="rounded-xl h-11 px-6 border-2 gap-2 font-bold">
                            <Share2 size={18} /> 공유
                        </Button>
                        <Button variant="outline" className="rounded-xl h-11 px-6 border-2 gap-2 font-bold">
                            <Download size={18} /> CSV 내보내기
                        </Button>
                        <Button className="rounded-xl h-11 px-8 shadow-xl shadow-primary/20 gap-2 font-black">
                            <ShieldCheck size={18} /> 무결성 검증
                        </Button>
                    </div>
                }
            />

            {/* Security Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/10 via-background to-emerald-500/5 border-2 border-emerald-500/10 shadow-xl relative overflow-hidden group">
                    <Lock className="absolute -bottom-4 -right-4 w-32 h-32 opacity-5 text-emerald-500 group-hover:rotate-12 transition-transform duration-700" />
                    <div className="flex items-center gap-3 mb-4 text-emerald-600">
                        <ShieldCheck size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Trust Index</span>
                    </div>
                    <h3 className="text-4xl font-black text-emerald-600 mb-2 tracking-tighter">99.9<span className="text-xl">%</span></h3>
                    <p className="text-xs font-bold text-muted-foreground opacity-70">데이터 무결성 검증이 완료되었습니다.</p>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 via-background to-amber-500/5 border-2 border-amber-500/10 shadow-xl relative overflow-hidden group">
                    <Activity className="absolute -bottom-4 -right-4 w-32 h-32 opacity-5 text-amber-500 group-hover:scale-110 transition-transform duration-700" />
                    <div className="flex items-center gap-3 mb-4 text-amber-600">
                        <Activity size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Recent Events</span>
                    </div>
                    <h3 className="text-4xl font-black text-amber-600 mb-2 tracking-tighter">1,204</h3>
                    <p className="text-xs font-bold text-muted-foreground opacity-70">지난 24시간 동안 발생한 보안 이벤트</p>
                </div>

                <div className="p-8 rounded-[3rem] bg-primary text-white shadow-2xl shadow-primary/30 relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-3xl animate-pulse" />
                    <h4 className="relative z-10 text-sm font-black uppercase tracking-widest opacity-80 mb-2">Immutable Ledger</h4>
                    <p className="relative z-10 text-xl font-bold leading-tight">모든 변경 이력은<br />암호화되어 안전하게 보관됩니다.</p>
                </div>
            </div>

            <VisualAuditTimeline logs={MOCK_AUDIT_LOGS} />

            {/* Info Banner */}
            <div className="p-10 bg-slate-100/50 rounded-[3rem] border-2 border-dashed border-primary/10 flex items-center gap-10">
                <div className="p-6 bg-white rounded-[2rem] shadow-xl">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                        <HistoryIcon size={32} />
                    </div>
                </div>
                <div className="space-y-3">
                    <h4 className="text-lg font-black tracking-tight">How Audit Time-Machine Works?</h4>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-2xl">
                        시스템의 모든 상태 변화는 스냅샷으로 캡처되어 블록체인 기반 원장에 저징됩니다.
                        상세 뷰어의 <b>'Neural Change Detection'</b> 엔진은 속성별 변경 내역을 시각적으로 분석하여 관리자가
                        단 1밀리초의 비인가 접근이나 오작동도 놓치지 않도록 보조합니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
