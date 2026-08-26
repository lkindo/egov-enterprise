'use client';

import { useRef, useState, useEffect } from 'react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { myPageAdminService } from '@/services/foundation/workspace/MyPageAdminService';
import { useToast } from '@/app/components/ui/toast';
import { RefreshCcw, MoreVertical } from 'lucide-react';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type WorkspaceContent = {
  contsSn: number;
  cntntsNm: string;
  cntcUrl: string;
  cntntsUseYn: 'Y' | 'N';
  cntntsLinkUrl?: string;
  cntntsDc?: string;
};

export default function WorkspaceMyPage() {
  const [contents, setContents] = useState<WorkspaceContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pendingContentIds, setPendingContentIds] = useState<Set<number>>(new Set());
  const pendingContentIdsRef = useRef(new Set<number>());
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const data = await myPageAdminService.getContents({ all: true });
        setContents(data || []);
      } catch {
        toast('콘텐츠 정보를 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  const toggleStatus = async (item: WorkspaceContent) => {
    if (pendingContentIdsRef.current.has(item.contsSn)) return;
    pendingContentIdsRef.current.add(item.contsSn);
    setPendingContentIds((current) => new Set(current).add(item.contsSn));
    const newStatus = item.cntntsUseYn === 'Y' ? 'N' : 'Y';
    try {
      await myPageAdminService.updateContent(item.contsSn, { ...item, cntntsUseYn: newStatus });
      setContents((current) => current.map((content) => (
        content.contsSn === item.contsSn ? { ...content, cntntsUseYn: newStatus } : content
      )));
      toast(`${item.cntntsNm} 상태가 변경되었습니다.`, 'success');
    } catch {
      toast('상태 변경 중 오류가 발생했습니다.', 'error');
    } finally {
      pendingContentIdsRef.current.delete(item.contsSn);
      setPendingContentIds((current) => {
        const next = new Set(current);
        next.delete(item.contsSn);
        return next;
      });
    }
  };

  const columns: Column<WorkspaceContent>[] = [
    {
      header: '번호',
      accessor: (_, index) => <span className="font-mono text-xs font-bold text-muted-foreground">{(index! + 1).toString().padStart(2, '0')}</span>,
      className: 'w-20 text-center'
    },
    {
      header: '콘텐츠 명칭',
      accessor: (item) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.cntntsNm}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">SN: {item.contsSn}</span>
        </div>
      )
    },
    {
      header: '연동 URL',
      accessor: (item) => <span className="text-xs font-bold text-muted-foreground font-mono tracking-tighter truncate max-w-xs block">{item.cntcUrl}</span>
    },
    {
      header: '상태',
      accessor: (item) => {
        const isPending = pendingContentIds.has(item.contsSn);
        return (
        <button 
          onClick={(e) => { e.stopPropagation(); toggleStatus(item); }}
          aria-label={`${item.cntntsNm || '콘텐츠'} ${isPending ? '상태 변경 중' : '상태 변경'}`}
          aria-busy={isPending || undefined}
          disabled={isPending}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
            item.cntntsUseYn === 'Y' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-muted text-muted-foreground border border-border'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${item.cntntsUseYn === 'Y' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
          {item.cntntsUseYn === 'Y' ? '활성' : '중단'}
        </button>
        );
      },
      className: 'w-32 text-center'
    },
    {
      header: '관리',
      accessor: () => (
        <div className="flex justify-end pr-4">
          <Button variant="ghost" size="icon" aria-label="위젯 추가 옵션" className="h-10 w-10 rounded-lg hover:bg-muted">
            <MoreVertical size={16} className="text-muted-foreground" />
          </Button>
        </div>
      ),
      className: 'w-20 text-right'
    }
  ];

  const visibleContents = contents.filter((c) => c.cntntsNm.includes(searchKeyword));

  return (
    <WorkListPage
      title="마이페이지 환경 설정"
      description="개인 대시보드에 배치할 콘텐츠와 위젯을 관리합니다."
      breadcrumbItems={[{ label: '워크스페이스' }, { label: '설정' }]}
      filterStateKey="workspace-my-page"
      totalCount={contents.length}
      actions={
        /* 종전의 '콘텐츠 동기화' 버튼은 onClick 이 없는 死버튼이라 제거했다(카탈로그 G10). */
        <Button
          variant="outline"
          size="sm"
          aria-label="마이페이지 새로고침"
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCcw size={16} aria-hidden="true" />
          새로고침
        </Button>
      }
      filter={
        <div className="min-w-60 max-w-xl space-y-1">
          <label htmlFor="my-page-search" className="text-[length:var(--font-size-body)] font-medium">
            콘텐츠 명칭
          </label>
          <Input
            id="my-page-search"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="콘텐츠 명칭으로 검색"
          />
        </div>
      }
    >
      <StandardDataTable
        accessibleLabel="마이페이지 콘텐츠 목록"
        columns={columns}
        data={visibleContents}
        loading={loading}
        emptyMessage={emptyResultMessage(searchKeyword, '등록된 콘텐츠가 없습니다.')}
      />
    </WorkListPage>
  );
}
