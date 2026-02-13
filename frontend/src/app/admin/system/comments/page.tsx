'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { commentMngService, CommentDetail } from '@/services/commentMngService';
import { useToast } from '@/app/components/ui/toast';
import { MessageSquare, Trash2, ExternalLink, User } from 'lucide-react';

export default function CommentAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentDetail[]>([]);

  const loadData = useCallback(async (searchWrd?: string) => {
    try {
      setLoading(true);
      const res = await commentMngService.getComments({ page: 0, size: 20, searchWrd });
      if (res.success) setComments(res.data.content || []);
    } catch (error) {
      toast('댓글 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    { header: 'No', accessor: 'commentNo', className: 'w-16 text-muted-foreground font-mono' },
    { 
      header: '댓글 내용', 
      accessor: (item: CommentDetail) => (
        <span className="font-bold text-foreground line-clamp-1">{item.commentCn}</span>
      ),
      className: 'min-w-[300px]'
    },
    { 
      header: '작성자', 
      accessor: (item: CommentDetail) => (
        <div className="flex items-center gap-2">
          <User size={12} className="text-muted-foreground" />
          <span className="text-xs">{item.wrterNm} ({item.wrterId})</span>
        </div>
      )
    },
    { header: '작성일', accessor: 'createdDate', className: 'text-[10px] text-muted-foreground' },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: CommentDetail) => (
        <div className="flex justify-end gap-2">
          <button className="p-1.5 hover:bg-accent rounded-md text-primary" title="원문 보기"><ExternalLink size={16} /></button>
          <button 
            onClick={() => toast('삭제되었습니다(Mock)', 'info')}
            className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md"
            title="삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="전사 댓글 통합 모니터링" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '댓글관리' }]}
      />

      <StandardSearchFilter 
        fields={[
          { name: 'searchWrd', label: '댓글 내용/작성자 검색', type: 'text', placeholder: '검색어 입력...' }
        ]}
        onSearch={(v) => loadData(v.searchWrd)}
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <MessageSquare size={14} /> 전체 댓글 이력
          </h3>
        </div>
        <StandardDataTable 
          columns={columns} 
          data={comments} 
          loading={loading}
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}
