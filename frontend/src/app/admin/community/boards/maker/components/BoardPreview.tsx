'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Search, 
  MessageSquare, 
  Eye, 
  Clock, 
  ChevronRight, 
  MoreHorizontal,
  ThumbsUp,
  Share2,
  Calendar,
  Grid,
  List as ListIcon,
  ImageIcon,
  HelpCircle,
  CheckCircle2,
  CalendarDays,
  User,
  ChevronDown,
  Book
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface PreviewProps {
  tmplatId: string;
  bbsNm: string;
  bbsIntrcn: string;
}

const MOCK_POSTS = [
  { id: 1, title: '?꾩옄?뺣? ?쒖??꾨젅?꾩썙??4.x ?낅뜲?댄듃 媛?대뱶?쇱씤', author: '愿由ъ옄', date: '2024-05-20', views: 1240, comments: 45, image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80' },
  { id: 2, title: '由ъ븸???쒕쾭 而댄룷?뚰듃(RSC) ?꾩엯 ??二쇱쓽?ы빆 諛?紐⑤쾾 ?щ?', author: '湲곗닠?곸떊?', date: '2024-05-19', views: 856, comments: 23, image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80' },
  { id: 3, title: 'MSA ?섍꼍?먯꽌??遺꾩궛 ?몃옖??뀡 泥섎━ ?꾨왂 (Saga ?⑦꽩)', author: '?뚮옯?쇱떎', date: '2024-05-18', views: 2301, comments: 67, image: 'https://images.unsplash.com/photo-1558494949-ef010958384e?w=800&q=80' },
];

export function BoardPreview({ tmplatId, bbsNm, bbsIntrcn }: PreviewProps) {
  return (
    <div className="w-full h-full bg-slate-50 border-4 border-slate-900 rounded-[0.1rem] overflow-hidden shadow-2xl relative flex flex-col scale-[0.95] origin-top italic">
      {/* Browser Bar */}
      <div className="h-12 bg-slate-900 flex items-center px-6 gap-2">
         <div className="w-3 h-3 rounded-full bg-rose-500" />
         <div className="w-3 h-3 rounded-full bg-amber-500" />
         <div className="w-3 h-3 rounded-full bg-emerald-500" />
         <div className="flex-1 ml-4 bg-white/10 h-7 rounded-lg flex items-center px-4">
            <span className="text-[10px] font-black text-white/40 tracking-widest uppercase truncate">HTTP://EGOV.PRIME/BOARD/{bbsNm || 'UNNAMED'}</span>
         </div>
      </div>

      <div className="flex-1 overflow-auto p-8 space-y-8 bg-white not-italic">
        {/* Board Header */}
        <div className="space-y-4 border-b-4 border-slate-900 pb-10">
           <div className="flex justify-between items-end">
              <div className="space-y-2">
                 <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">{bbsNm || 'PREVIEW_BOARD'}</h1>
                 <p className="text-sm font-bold text-slate-400 tracking-tight">{bbsIntrcn || 'Board description placeholder...'}</p>
              </div>
              <div className="flex gap-2">
                 <div className="w-10 h-10 rounded-[0.1rem] bg-slate-900 flex items-center justify-center text-white"><Search size={18} strokeWidth={3} /></div>
                 <div className="w-10 h-10 rounded-[0.1rem] bg-primary flex items-center justify-center text-white font-black text-[10px] tracking-tighter">WRITE</div>
              </div>
           </div>
        </div>

        {/* Dynamic Content based on Template */}
        {tmplatId === 'TMPLT_HUB' && <HubLayout posts={MOCK_POSTS} />}
        {tmplatId === 'TMPLT_LIST' && <ListLayout posts={MOCK_POSTS} />}
        {tmplatId === 'TMPLT_GALLERY' && <GalleryLayout posts={MOCK_POSTS} />}
        {tmplatId === 'TMPLT_QNA' && <QnaLayout posts={MOCK_POSTS} />}
        {tmplatId === 'TMPLT_CALENDAR' && <CalendarLayout posts={MOCK_POSTS} />}
        {tmplatId === 'TMPLT_FAQ' && <FaqLayout posts={MOCK_POSTS} />}
        {tmplatId === 'TMPLT_WIKI' && <WikiLayout posts={MOCK_POSTS} />}
      </div>

      <div className="h-10 bg-slate-100 flex items-center justify-center border-t border-slate-200">
         <span className="text-[8px] font-black text-slate-300 tracking-[0.4em] uppercase">SYSTEM_PREVIEW_GENERATOR_V1.1_STABLE</span>
      </div>
    </div>
  );
}

function HubLayout({ posts }: { posts: any[] }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
         <div className="col-span-2 p-8 bg-slate-900 rounded-[0.1rem] text-white relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative z-10 space-y-4">
               <span className="text-[10px] font-black tracking-[0.4em] text-primary uppercase">FEATURED_KNOWLEDGE</span>
               <h3 className="text-2xl font-black tracking-tight leading-tight">{posts[0].title}</h3>
               <div className="flex items-center gap-6 mt-6">
                  <div className="flex items-center gap-2">
                     <span className="text-[11px] font-black text-white/40 italic">BY</span>
                     <span className="text-[11px] font-black">{posts[0].author}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                     <Clock size={12} />
                     <span className="text-[10px] font-bold">1 hour ago</span>
                  </div>
               </div>
            </div>
         </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
         {posts.slice(1).map(post => (
            <div key={post.id} className="p-6 bg-slate-50 rounded-[0.1rem] border-2 border-slate-100 space-y-4 hover:border-slate-900 transition">
                <h4 className="font-black text-slate-800 text-sm leading-snug truncate-2">{post.title}</h4>
                <div className="flex justify-between items-center pt-2">
                   <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px]"><Eye size={12} /> {post.views}</div>
                      <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px]"><MessageSquare size={12} /> {post.comments}</div>
                   </div>
                   <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300">
                      <ChevronRight size={14} />
                   </div>
                </div>
            </div>
         ))}
      </div>
    </div>
  );
}

function ListLayout({ posts }: { posts: any[] }) {
  return (
    <div className="space-y-2">
       {posts.map(post => (
          <div key={post.id} className="flex items-center justify-between p-6 border-b-2 border-slate-50 hover:bg-slate-50 transition group">
             <div className="flex-1 flex items-center gap-8">
                <span className="text-[10px] font-black text-slate-300 w-10">0{post.id}</span>
                <div className="flex-1">
                   <h4 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors">{post.title}</h4>
                   <div className="flex items-center gap-4 mt-1">
                      <span className="text-[10px] font-bold text-slate-400">{post.author}</span>
                      <span className="text-[10px] font-medium text-slate-400 opacity-50 underline decoration-slate-200">#Enterprise</span>
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-8">
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400">{post.date}</p>
                   <p className="text-[9px] font-bold text-slate-300">PUBLIC_CONTENT</p>
                </div>
                <MoreHorizontal size={16} className="text-slate-200" />
             </div>
          </div>
       ))}
    </div>
  );
}

function GalleryLayout({ posts }: { posts: any[] }) {
  return (
    <div className="grid grid-cols-1 gap-8">
       {posts.map(post => (
          <div key={post.id} className="group overflow-hidden rounded-[0.1rem] bg-white border-2 border-slate-100 shadow-sm transition hover:shadow-2xl hover:-translate-y-2">
             <div className="h-48 overflow-hidden relative">
                <img src={post.image} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition duration-700 scale-110 group-hover:scale-100" />
                <div className="absolute top-4 right-4 px-4 py-1.5 bg-slate-900/40 backdrop-blur-md rounded-full text-white text-[8px] font-black tracking-widest uppercase">INSIGHT</div>
             </div>
             <div className="p-8 space-y-6">
                <h4 className="text-xl font-black text-slate-900 tracking-tighter leading-snug">{post.title}</h4>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-[9px] italic">OP</div>
                      <span className="text-xs font-black text-slate-700">{post.author}</span>
                   </div>
                   <div className="flex gap-4">
                      <Share2 size={14} className="text-slate-300" />
                      <ThumbsUp size={14} className="text-slate-300" />
                   </div>
                </div>
             </div>
          </div>
       ))}
    </div>
  );
}

function QnaLayout({ posts }: { posts: any[] }) {
  return (
    <div className="space-y-4">
       {posts.map((post, idx) => (
          <div key={post.id} className="p-6 bg-white border-2 border-slate-100 rounded-[0.1rem] flex gap-6 hover:border-amber-500 transition group">
             <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center font-black text-xl shadow-inner",
                  idx === 0 ? "bg-amber-100 text-amber-600 border-2 border-amber-200" : "bg-slate-50 text-slate-300 border border-slate-100"
                )}>
                  {idx === 0 ? <CheckCircle2 size={24} /> : '?' }
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{idx === 0 ? 'Solved' : 'Open'}</span>
             </div>
             <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                   <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none text-[9px] font-black">TECH_SUPPORT</Badge>
                   <span className="text-[10px] font-bold text-slate-300 italic">{post.date}</span>
                </div>
                <h4 className="text-lg font-black text-slate-800 leading-tight group-hover:text-amber-600 transition-colors uppercase italic tracking-tighter">{post.title}</h4>
                <div className="flex items-center gap-4 text-slate-400 font-bold text-[10px]">
                   <span className="flex items-center gap-1"><User size={12} /> {post.author}</span>
                   <span className="flex items-center gap-1"><MessageSquare size={12} /> {post.comments} Answers</span>
                </div>
             </div>
          </div>
       ))}
    </div>
  );
}

function FaqLayout({ posts }: { posts: any[] }) {
  return (
    <div className="space-y-4">
      {posts.slice(0, 3).map((post, idx) => (
        <Card key={idx} className="border-2 border-slate-50 overflow-hidden rounded-[0.1rem] hover:border-purple-500 transition group">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center font-black text-xl transition",
                idx === 0 ? "bg-purple-500 text-white shadow-lg" : "bg-slate-100 text-slate-400"
              )}>
                Q
              </div>
              <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight italic">{post.title}</h4>
            </div>
            <ChevronDown className="w-6 h-6 text-slate-300" />
          </div>
          {idx === 0 && (
            <div className="px-24 pb-10">
               <div className="p-8 bg-slate-50 rounded-[0.1rem] border-l-8 border-purple-500 text-slate-600 font-medium leading-relaxed">
                  {post.content}
               </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function WikiLayout({ posts }: { posts: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {posts.map((post, idx) => (
        <Card key={idx} className="group overflow-hidden border-2 border-slate-50 hover:border-slate-900 transition rounded-[0.1rem]">
          <div className="flex">
            <div className="w-16 bg-slate-50 flex items-center justify-center shrink-0 border-r border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors">
               <Book size={24} className="opacity-40" />
            </div>
            <div className="p-8 space-y-4">
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic group-hover:text-primary transition-colors">{post.title}</h4>
              <p className="text-sm text-slate-400 font-black tracking-widest uppercase">Last modified by {post.author}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function CalendarLayout({ posts }: { posts: any[] }) {
  const days = Array.from({ length: 35 }, (_, i) => i + 1 - 3); // Simple offset for preview
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[0.1rem] border-2 border-slate-100">
          <h4 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">May 2024</h4>
          <div className="flex gap-2">
             <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400"><ChevronRight className="rotate-180" size={16} /></div>
             <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400"><ChevronRight size={16} /></div>
          </div>
       </div>
       <div className="grid grid-cols-7 gap-2">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
             <div key={d} className="text-[10px] font-black text-slate-300 text-center pb-2 tracking-widest">{d}</div>
          ))}
          {days.map((day, i) => (
             <div key={i} className={cn(
               "h-24 p-2 border-2 border-slate-50 rounded-[0.1rem] transition relative group overflow-hidden",
               day === 20 ? "bg-primary/5 border-primary/20" : "bg-white",
               day <= 0 || day > 31 ? "opacity-10" : "hover:border-slate-900"
             )}>
                <span className={cn("text-xs font-black", day === 20 ? "text-primary" : "text-slate-300")}>
                  {day > 0 && day <= 31 ? day : ''}
                </span>
                {day === 20 && (
                  <div className="mt-2 p-1.5 bg-primary text-white text-[8px] font-black leading-tight rounded-sm shadow-lg shadow-primary/20 animate-in fade-in slide-in-from-bottom-2">
                    EGOV_TECH_SEMINAR_4.0
                  </div>
                )}
                {day === 21 && (
                  <div className="mt-1 p-1.5 bg-slate-900 text-white text-[8px] font-black leading-tight rounded-sm opacity-40">
                    MAINTENANCE_LOG
                  </div>
                )}
             </div>
          ))}
       </div>
    </div>
  );
}
