'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, Share2, BookOpen } from "lucide-react";
import { BoardPost } from '@/types/business/board';
import { cn } from "@/lib/utils";

interface BoardTemplateGalleryProps {
  list: BoardPost[];
  bbsId: string;
  querySearchWrd: string;
  onLike: (e: React.MouseEvent, nttId: string) => void;
  isLikePending?: boolean;
}

// HighlightText is local to this file or can be imported if shared
const HighlightText = ({ text, highlight }: { text: string | undefined; highlight: string }) => {
  if (!text) return null;
  if (!highlight.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const BoardTemplateGallery = ({ list, bbsId, querySearchWrd, onLike, isLikePending }: BoardTemplateGalleryProps) => {
  if (list.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10 p-10">
      {list.map((item: BoardPost) => (
        <Card key={item.nttId} className="group overflow-hidden rounded-lg bg-white border-2 border-slate-100 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2">
          <div className="h-64 overflow-hidden relative bg-slate-100">
            <div className="w-full h-full flex items-center justify-center bg-slate-200 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 group-hover:scale-105 transition-transform duration-700" />
              <BookOpen size={120} className="text-slate-400 opacity-20 relative z-10" />
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-500" />
            </div>
            <div className="absolute top-6 right-6 px-4 py-1.5 bg-slate-900/60 backdrop-blur-md rounded-lg text-white text-xs font-bold tracking-widest uppercase">INSIGHT</div>
          </div>
          <CardContent className="p-8 space-y-6">
            <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&nttId=${item.nttId}`}>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tighter leading-tight group-hover:text-primary transition-colors cursor-pointer line-clamp-2">
                <HighlightText text={item.nttSj} highlight={querySearchWrd} />
              </h3>
            </Link>
            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-800">OP</div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none mb-1">
                    <HighlightText text={item.frstRegisterNm} highlight={querySearchWrd} />
                  </span>
                  <span className="text-xs font-bold text-slate-600">{item.createdDate ? String(item.createdDate).substring(0, 10) : '-'}</span>
                </div>
              </div>
              <div className="flex gap-6">
                <button 
                  data-testid="like-button"
                  onClick={(e) => onLike(e, String(item.nttId))}
                  className="flex items-center gap-1.5 text-slate-300 hover:text-primary transition-all active:scale-125"
                  aria-label="좋아요"
                >
                  <ThumbsUp size={16} className={cn(isLikePending && "animate-bounce")} />
                  <span data-testid="like-count" className="text-xs font-bold text-slate-900">{item.likeCo || 0}</span>
                </button>
                <div className="flex items-center gap-1.5 text-slate-300" aria-label="공유하기"><Share2 size={16} /></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
