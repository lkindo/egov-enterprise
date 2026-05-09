'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book } from "lucide-react";
import { BoardPost } from '@/types/business/board';

interface BoardTemplateWikiProps {
  list: BoardPost[];
  bbsId: string;
  querySearchWrd: string;
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

export const BoardTemplateWiki = ({ list, bbsId, querySearchWrd }: BoardTemplateWikiProps) => {
  if (list.length === 0) return null;

  return (
    <div className="p-10 space-y-8">
      {list.map((item: BoardPost) => (
        <Card key={item.nttId} className="group overflow-hidden border-2 border-slate-50 hover:border-slate-900 transition-all rounded-lg">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-16 bg-slate-100 flex md:flex-col items-center justify-center p-4 gap-2 shrink-0">
              <Book className="text-slate-400 group-hover:text-slate-900 transition-colors" size={24} />
            </div>
            <div className="flex-1 p-8 space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs font-bold uppercase tracking-widest text-slate-400 rounded-none border-slate-200">Doc v1.0</Badge>
                <span className="text-xs font-bold text-slate-300 ">{item.createdDate ? String(item.createdDate).substring(0, 10) : '-'}</span>
              </div>
              <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&nttId=${item.nttId}`}>
                <h4 className="text-2xl font-bold text-slate-900 leading-tight group-hover:underline decoration-slate-900 decoration-4 underline-offset-8 transition-all">
                  <HighlightText text={item.nttSj} highlight={querySearchWrd} />
                </h4>
              </Link>
              <p className="text-slate-500 font-medium line-clamp-2 leading-relaxed">{item.nttCn}</p>
              <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Author</span>
                  <span className="text-xs font-bold text-slate-600">
                    <HighlightText text={item.frstRegisterNm} highlight={querySearchWrd} />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Views</span>
                  <span className="text-xs font-bold text-slate-600">{item.inqireCo}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
