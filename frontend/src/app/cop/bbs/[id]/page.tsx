'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { boardService } from '@/services/boardService';
import { BoardPost } from '@/types/board';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Calendar, User, Eye, ArrowLeft, Trash2, Edit3, Paperclip } from 'lucide-react';

export default function BoardDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const bbsId = searchParams.get('bbsId') || '';
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [post, setPost] = useState<BoardPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPost() {
      try {
        const res = await boardService.getPost(bbsId, parseInt(id as string));
        if (res) setPost(res);
      } catch (error) {
        toast('게시글을 찾을 수 없습니다.', 'error');
        router.back();
      } finally {
        setLoading(false);
      }
    }
    if (bbsId && id) loadPost();
  }, [id, bbsId, toast, router]);

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: '게시글 삭제',
      message: '정말로 이 게시글을 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.',
      variant: 'destructive'
    });

    if (isConfirmed) {
      try {
        await boardService.deletePost(bbsId, parseInt(id as string));
        toast('성공적으로 삭제되었습니다.', 'success');
        router.push('/cop/bbs');
      } catch (error) {
        toast('삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse font-medium">로딩 중...</div>;
  if (!post) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <PageHeader 
        title="게시글 상세"
        breadcrumbs={[{ label: '게시판', href: '/cop/bbs' }, { label: post.nttSj }]}
        actions={
          <div className="flex gap-2">
            <button onClick={() => router.back()} className="p-2.5 border rounded-lg hover:bg-accent transition-all"><ArrowLeft size={20} /></button>
            <button className="p-2.5 border rounded-lg hover:bg-accent transition-all"><Edit3 size={20} /></button>
            <button onClick={handleDelete} className="p-2.5 border rounded-lg hover:bg-destructive/10 text-destructive transition-all"><Trash2 size={20} /></button>
          </div>
        }
      />

      <article className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        {/* Post Info Header */}
        <div className="p-8 border-b bg-muted/5 space-y-4">
          <h2 className="text-3xl font-black text-foreground leading-tight">{post.nttSj}</h2>
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-medium">
            <div className="flex items-center gap-2"><User size={16} className="text-primary" /> {post.frstRegisterNm}</div>
            <div className="flex items-center gap-2"><Calendar size={16} /> {post.createdDate}</div>
            <div className="flex items-center gap-2"><Eye size={16} /> {post.inqireCo} 회</div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 prose prose-slate dark:prose-invert max-w-none min-h-[400px]">
          <div dangerouslySetInnerHTML={{ __html: post.nttCn.replace(/\n/g, '<br/>') }} />
        </div>

        {/* Attachments Section */}
        {post.atchFileId && (
          <div className="p-6 bg-muted/10 border-t mx-8 mb-8 rounded-xl flex items-center gap-4">
            <Paperclip size={20} className="text-muted-foreground" />
            <span className="text-sm font-bold">첨부파일이 존재합니다.</span>
            <button className="text-xs text-primary font-bold hover:underline">파일 목록 보기</button>
          </div>
        )}
      </article>
    </div>
  );
}
