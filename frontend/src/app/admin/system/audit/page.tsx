'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { VirtualScrollList } from '@/app/components/ui/virtual-scroll-list';
import { auditService, AuditLog } from '@/services/auditService';
import { useToast } from '@/app/components/ui/toast';
import { ShieldCheck, History, User, Clock, Search, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminAuditPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [keyword, setKeyword] = useState('');

  const loadLogs = useCallback(async (searchKeyword?: string) => {
    try {
      setLoading(true);
      const res = await auditService.getAuditLogs({ 
        page: 0, 
        size: 1000, // 가상 리스트 테스트를 위해 대량 조회 가정 
        keyword: searchKeyword 
      });
      if (res.success) {
        setLogs(res.data.content);
      }
    } catch (error) {
      toast('감사 로그를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearch = (values: Record<string, string>) => {
    setKeyword(values.keyword);
    loadLogs(values.keyword);
  };

  const renderLogItem = (log: AuditLog, index: number) => (
    <div className="flex items-center gap-4 px-6 py-4 border-b hover:bg-accent/30 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xs font-black text-primary px-2 py-0.5 bg-primary/10 rounded uppercase">
            {log.sysNm}
          </span>
          <span className="text-sm font-bold text-foreground truncate">
            {log.histCn}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5"><User size={12} /> {log.frstRegisterId}</div>
          <div className="flex items-center gap-1.5"><Clock size={12} /> {log.frstRegisterPnttm}</div>
        </div>
      </div>
      <button className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-primary transition-all">
        <ExternalLink size={16} />
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
      <PageHeader 
        title="시스템 감사 및 데이터 이력 관제" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '감사 로그' }]}
        actions={
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground px-3 py-1.5 bg-muted/20 rounded-lg border">
            <History size={14} />
            전체 로그: {logs.length.toLocaleString()} 건
          </div>
        }
      />

      {/* 실시간 필터 영역 */}
      <StandardSearchFilter 
        fields={[
          { name: 'keyword', label: '로그 검색', type: 'text', placeholder: '시스템명, 내용, 작업자...' }
        ]}
        onSearch={handleSearch}
        className="mb-0"
      />

      {/* 대용량 대응 가상 리스트 영역 */}
      <div className="flex-1 bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="grid grid-cols-1 divide-y flex-1 min-h-0">
          {loading ? (
            <div className="p-12 text-center animate-pulse text-muted-foreground font-medium flex flex-col items-center gap-4">
              <Search size={48} className="opacity-20" />
              대용량 로그를 분석하는 중입니다...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic flex flex-col items-center gap-4">
              <ShieldCheck size={48} className="opacity-10" />
              검색 조건에 맞는 감사 로그가 없습니다.
            </div>
          ) : (
            <VirtualScrollList 
              items={logs} 
              itemHeight={80} 
              containerHeight={600} // 실제 프로젝트 환경에선 calc(100vh - ...) 등으로 유동적 조절 가능
              renderItem={renderLogItem}
              className="border-none rounded-none h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
