'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { scrapService, Scrap } from '@/services/scrapService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Bookmark, ExternalLink, Trash2, Calendar, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ScrapPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scraps, setScraps] = useState<Scrap[]>([]);

  const loadScraps = useCallback(async () => {
    try {
      setLoading(true);
      const res = (await scrapService.getMyScraps({ page: 0, size: 20 })) as any;
      if (res?.success) setScraps(res.data.content || []);
    } catch (error) {
      toast('스크랩 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadScraps();
  }, [loadScraps]);

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: '스크랩 삭제',
      message: '해당 스크랩을 삭제하시겠습니까?',
      variant: 'destructive'
    });

    if (isConfirmed) {
      try {
        await scrapService.deleteScrap(id);
        toast('스크랩이 삭제되었습니다.', 'success');
        loadScraps();
      } catch (error) {
        toast('삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const columns = [
    { 
      header: '제목', 
      accessor: (item: Scrap) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Bookmark size={16} fill="currentColor" />
          </div>
          <span className="font-bold text-foreground hover:text-primary cursor-pointer transition-colors">
            {item.scrapNm}
          </span>
        </div>
      ),
      className: 'min-w-[400px]'
    },
    { 
      header: '스크랩 일시', 
      accessor: (item: Scrap) => (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar size={12} />
          {item.createdDate}
        </div>
      )
    },
    {
      header: '액션',
      className: 'text-right',
      accessor: (item: Scrap) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => router.push(`/cop/bbs/${item.nttId}?bbsId=${item.bbsId}`)}
            className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-all"
            title="본문 보기"
          >
            <ExternalLink size={16} />
          </button>
          <button 
            onClick={() => handleDelete(item.scrapId)}
            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-all"
            title="삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="나의 스크랩 보관함" 
        breadcrumbs={[{ label: '협업지원' }, { label: '스크랩관리' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-card border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20"><FileText size={20} /></div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">전체 스크랩</p>
            <h4 className="text-xl font-black">{scraps.length} 건</h4>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <StandardDataTable 
          columns={columns} 
          data={scraps} 
          loading={loading}
          emptyMessage="보관된 스크랩이 없습니다."
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}
