'use client';

import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { BoardPost } from '@/types/business/board';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

interface BoardTemplateFaqProps {
  list: BoardPost[];
}

function FAQItem({ item }: { item: BoardPost }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-300 rounded-lg border-2",
        isOpen ? "border-purple-500 bg-purple-50/10 shadow-xl" : "border-slate-100 hover:border-purple-200"
      )}
    >
      <div 
        className="p-6 cursor-pointer flex items-center justify-between group"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen); } }}
      >
        <div className="flex items-center gap-6">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl transition-all",
            isOpen ? "bg-purple-500 text-white shadow-lg" : "bg-slate-100 text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-500"
          )}>
            Q
          </div>
          <h4 className={cn(
            "text-xl font-bold tracking-tighter transition-colors",
            isOpen ? "text-purple-600" : "text-slate-800"
          )}>
            {item.pstTtl}
          </h4>
        </div>
        <div className={cn(
          "transition-transform duration-300",
          isOpen ? "rotate-180 text-purple-500" : "text-slate-300"
        )}>
          <ChevronDown size={24} />
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-8 ml-[72px] border-t border-purple-100/50 pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-emerald-500/20">A</div>
                <div className="space-y-4">
                  <p className="text-slate-600 font-medium leading-relaxed text-lg whitespace-pre-wrap">
                    {item.pstCn}
                  </p>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-300 uppercase tracking-widest pt-4">
                    <span>Last Updated: {item.createdDate ? String(item.createdDate).substring(0, 10) : '-'}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-lg" />
                    <span>Views: {item.inqireCo}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export const BoardTemplateFaq = ({ list }: BoardTemplateFaqProps) => {
  if (list.length === 0) return null;

  return (
    <div className="p-10 space-y-4">
      {list.map((item: BoardPost) => (
        <FAQItem key={item.pstId} item={item} />
      ))}
    </div>
  );
};
