'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Eye, ChevronRight } from "lucide-react";
import { BoardPost } from '@/types/business/board';

interface BoardTemplateHubProps {
  list: BoardPost[];
  bbsId: string;
  page: number;
}

export const BoardTemplateHub = ({ list, bbsId, page }: BoardTemplateHubProps) => {
  if (list.length === 0) return null;

  return (
    <div className="space-y-10 p-10">
      {/* Hub Featured Section */}
      {page === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-12 p-10 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white relative overflow-hidden group border-none shadow-xl">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-primary/10 dark:bg-primary/20 blur-[100px] rounded-lg" />
            <div className="relative z-10 space-y-6">
              <Badge className="bg-primary hover:bg-primary text-white border-none font-bold tracking-[0.4em] uppercase py-1 px-4 text-xs">FEATURED_KNOWLEDGE</Badge>
              <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${list[0].pstId}`}>
                <h3 className="text-4xl font-bold tracking-tight leading-tight group-hover:text-primary transition-colors cursor-pointer">{list[0].nttSj}</h3>
              </Link>
              <div className="flex items-center gap-8 mt-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-white/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20 dark:border-white/10">OP</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-600 dark:text-white/80 uppercase tracking-widest leading-none mb-1">Author</span>
                    <span className="text-sm font-bold">{list[0].frstRegisterNm}</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                <div className="flex items-center gap-3 text-slate-600 dark:text-white/80">
                  <Clock size={16} />
                  <span className="text-xs font-bold">{list[0].createdDate ? String(list[0].createdDate).substring(0, 10) : 'Just now'}</span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                <div className="flex items-center gap-3 text-slate-600 dark:text-white/80">
                  <Eye size={16} />
                  <span className="text-xs font-bold">{list[0].inqireCo} views</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* Grid for minor posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(page === 1 ? list.slice(1) : list).map((item: BoardPost) => (
          <Card key={item.pstId} className="group p-8 bg-slate-50/50 rounded-lg border-2 border-slate-100 space-y-6 hover:border-primary transition-all cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:scale-125 transition-all text-primary">
              <BookOpen size={60} />
            </div>
            <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${item.pstId}`}>
              <h4 className="font-bold text-slate-800 text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">{item.nttSj}</h4>
            </Link>
            <div className="flex justify-between items-center pt-4 border-t border-slate-200/50">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs"><Eye size={14} /> {item.inqireCo}</div>
                <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs"><MessageSquare size={14} /> 0</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                <ChevronRight size={18} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const MessageSquare = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
