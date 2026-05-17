'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, HelpCircle, Clock, MessageSquare, ThumbsUp } from "lucide-react";
import { BoardPost } from '@/types/business/board';
import { cn } from "@/lib/utils";

interface BoardTemplateQnaProps {
  list: BoardPost[];
  bbsId: string;
  querySearchWrd: string;
  onLike: (e: React.MouseEvent, pstId: string) => void;
  isLikePending?: boolean;
}

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

export const BoardTemplateQna = ({ list, bbsId, querySearchWrd, onLike, isLikePending }: BoardTemplateQnaProps) => {
  if (list.length === 0) return null;

  return (
    <div className="space-y-6 p-10">
      {list.map((item: BoardPost) => (
        <Card key={item.pstId} className="group p-8 bg-white border-2 border-slate-100 rounded-lg flex gap-8 hover:border-amber-500 transition-all cursor-pointer relative overflow-hidden">
          <div className="flex flex-col items-center gap-2 min-w-[80px]">
            <div className={cn(
              "w-16 h-11 rounded-lg flex items-center justify-center font-bold text-2xl shadow-inner transition-all group-hover:scale-110",
              item.qnaStatus === 'SOLVED' ? "bg-emerald-100 text-emerald-600 border-2 border-emerald-200" : "bg-amber-100 text-amber-600 border-2 border-amber-200"
            )}>
              {item.qnaStatus === 'SOLVED' ? <CheckCircle2 size={32} /> : <HelpCircle size={32} /> }
            </div>
            <span className={cn(
              "text-xs font-bold uppercase tracking-widest",
              item.qnaStatus === 'SOLVED' ? "text-emerald-500" : "text-amber-500"
            )}>{item.qnaStatus === 'SOLVED' ? 'Solved' : 'Open'}</span>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-4">
              <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none text-xs font-bold px-3 py-1">
                {item.qnaCategory || 'GENERAL_QNA'}
              </Badge>
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Clock size={12} /> {item.createdDate ? String(item.createdDate).substring(0, 10) : '-'}</span>
            </div>
            <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${item.pstId}`}>
              <h4 className="text-2xl font-bold text-slate-800 leading-tight group-hover:text-amber-600 transition-colors tracking-tighter uppercase ">
                <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
              </h4>
            </Link>
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">AD</div>
                <span className="text-xs font-bold text-slate-600">
                  <HighlightText text={item.frstRegisterNm} highlight={querySearchWrd} />
                </span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                <MessageSquare size={14} className="text-amber-400" />
                <span>{item.commentCo || 0} Answers</span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <button 
                data-testid="like-button"
                onClick={(e) => onLike(e, String(item.pstId))}
                className="flex items-center gap-2 text-slate-600 hover:text-amber-500 font-bold text-xs transition-all active:scale-110"
                aria-label="좋아요"
              >
                <ThumbsUp size={14} className={cn("opacity-30", isLikePending && "animate-bounce")} />
                <span data-testid="like-count">{item.likeCo || 0} Likes</span>
              </button>
            </div>
          </div>
          <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover:opacity-[0.08] transition-all">
            <HelpCircle size={150} />
          </div>
        </Card>
      ))}
    </div>
  );
};
