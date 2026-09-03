import { cn } from '@/lib/utils';
import { Search,  
 MessageSquare,  
 Eye,  
 Clock,  
 ChevronRight,  
 MoreHorizontal, 
 ThumbsUp, 
 Share2, 
 CheckCircle2, 
 User, 
 ChevronDown, 
 Book } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface PreviewProps {
 tmpltId: string;
 bbsTtl: string;
 bbsExpln: string;
}

/**
 * 미리보기 레이아웃이 받는 행 모양.
 *
 * [2026-09-03] 종전에는 레이아웃 7개가 전부 `posts: any[]` 였다. 그런데 호출부는 예외 없이
 * 바로 아래 {@link MOCK_POSTS} 하나만 넘긴다 — 외부 API 계약과 무관한 **이 파일 안의 예시 데이터**다.
 * 즉 넓힐 이유가 없는 자리였고, `any` 8건(미사용 prop 1건 포함)을 혼자 만들고 있었다.
 * 예시 데이터의 모양을 그대로 타입으로 삼아 실제 데이터가 들어오면 그때 계약을 바꾸게 한다.
 */
type PreviewPost = (typeof MOCK_POSTS)[number];

const MOCK_POSTS = [
 // [2026-09-03] `content` 를 채운 이유: FAQ 레이아웃(FaqLayout)이 첫 항목의 답변 본문으로
 //   `post.content` 를 렌더하는데 그 필드가 없어 **답변 상자가 늘 비어 있었다**.
 //   `posts: any[]` 라 타입 검사가 이 누락을 못 봤고, 미리보기는 FAQ 템플릿을
 //   '답변이 보이지 않는 템플릿' 으로 잘못 보여 주고 있었다.
 { id: 1, title: '전자정부 표준프레임워크 4.x 업데이트 가이드라인', author: '관리자', date: '2024-05-20', views: 1240, comments: 45, content: '4.x 는 Java 21 과 Spring Boot 3 계열을 기준으로 합니다. 3.x 설정은 그대로 쓸 수 없으므로 마이그레이션 가이드의 호환성 표를 먼저 확인해 주세요.' },
 { id: 2, title: '리액트 서버 컴포넌트(RSC) 도입 시 주의사항 및 모범 사례', author: '기술혁신팀', date: '2024-05-19', views: 856, comments: 23, content: '서버 컴포넌트에서는 브라우저 전용 API 를 쓸 수 없습니다. 상태가 필요한 구간만 클라이언트 컴포넌트로 분리하세요.' },
 { id: 3, title: 'MSA 환경에서의 분산 트랜잭션 처리 전략 (Saga 패턴)', author: '플랫폼실', date: '2024-05-18', views: 2301, comments: 67, content: '2단계 커밋 대신 보상 트랜잭션으로 일관성을 맞춥니다. 각 단계는 실패 시 되돌릴 수 있어야 합니다.' },
];

export function BoardPreview({ tmpltId, bbsTtl, bbsExpln }: PreviewProps) {
 return (
 <div className="w-full h-full bg-muted border-4 border-foreground rounded-lg overflow-hidden shadow-2xl relative flex flex-col scale-[0.95] origin-top ">
 {/* Browser Bar */}
 <div className="h-12 bg-surface-inverse flex items-center px-6 gap-2">
 <div className="w-3 h-3 rounded-full bg-rose-500" />
 <div className="w-3 h-3 rounded-full bg-amber-500" />
 <div className="w-3 h-3 rounded-full bg-emerald-500" />
 <div className="flex-1 ml-4 bg-white/10 h-7 rounded-lg flex items-center px-4">
 <span className="text-xs font-bold text-surface-inverse-muted tracking-widest uppercase truncate">HTTP://EGOV.PRIME/BOARD/{bbsTtl || 'UNNAMED'}</span>
 </div>
 </div>

 <div className="flex-1 overflow-auto p-8 space-y-8 bg-card not-">
 {/* Board Header */}
 <div className="space-y-4 border-b-4 border-foreground pb-10">
 <div className="flex justify-between items-end">
 <div className="space-y-2">
 <h2 className="text-4xl font-bold tracking-tighter text-foreground uppercase leading-none">{bbsTtl || 'PREVIEW_BOARD'}</h2>
 <p className="text-sm font-bold text-muted-foreground tracking-tight">{bbsExpln || 'Board description placeholder...'}</p>
 </div>
 <div className="flex gap-2">
 <div className="w-10 h-10 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground"><Search size={18} strokeWidth={3} /></div>
 <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs tracking-tighter">WRITE</div>
 </div>
 </div>
 </div>

 {/* Dynamic Content based on Template */}
 {tmpltId === 'TMPLT_HUB' && <HubLayout posts={MOCK_POSTS} />}
 {tmpltId === 'TMPLT_LIST' && <ListLayout posts={MOCK_POSTS} />}
 {tmpltId === 'TMPLT_GALLERY' && <GalleryLayout posts={MOCK_POSTS} />}
 {tmpltId === 'TMPLT_QNA' && <QnaLayout posts={MOCK_POSTS} />}
 {tmpltId === 'TMPLT_CALENDAR' && <CalendarLayout />}
 {tmpltId === 'TMPLT_FAQ' && <FaqLayout posts={MOCK_POSTS} />}
 {tmpltId === 'TMPLT_WIKI' && <WikiLayout posts={MOCK_POSTS} />}
 </div>

 <div className="h-10 bg-muted flex items-center justify-center border-t border-border">
 <span className="text-xs font-bold text-muted-foreground tracking-tight">예시 데이터로 그린 레이아웃 미리보기입니다</span>
 </div>
 </div>
 );
}

function HubLayout({ posts }: { posts: PreviewPost[] }) {
 return (
 <div className="space-y-8">
 <div className="grid grid-cols-2 gap-6">
 <div className="col-span-2 p-8 bg-surface-inverse rounded-lg text-surface-inverse-foreground relative overflow-hidden group">
 <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary/20 blur-3xl rounded-lg" />
 <div className="relative z-10 space-y-4">
 <span className="text-xs font-bold tracking-[0.4em] text-surface-inverse-muted uppercase">FEATURED_KNOWLEDGE</span>
 <h3 className="text-2xl font-bold tracking-tight leading-tight">{posts[0].title}</h3>
 <div className="flex items-center gap-6 mt-6">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-surface-inverse-muted">BY</span>
 <span className="text-xs font-bold">{posts[0].author}</span>
 </div>
 <div className="flex items-center gap-2 text-surface-inverse-muted">
 <Clock size={12} />
 <span className="text-xs font-bold">1 hour ago</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-6">
 {posts.slice(1).map(post => (
 <div key={post.id} className="p-6 bg-muted rounded-lg border-2 border-border space-y-4 hover:border-foreground transition-all">
 <h4 className="font-bold text-foreground text-sm leading-snug truncate-2">{post.title}</h4>
 <div className="flex justify-between items-center pt-2">
 <div className="flex gap-4">
 <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs"><Eye size={12} /> {post.views}</div>
 <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs"><MessageSquare size={12} /> {post.comments}</div>
 </div>
 <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground">
 <ChevronRight size={14} />
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}

function ListLayout({ posts }: { posts: PreviewPost[] }) {
 return (
 <div className="space-y-2">
 {posts.map(post => (
 <div key={post.id} className="flex items-center justify-between p-6 border-b-2 border-border hover:bg-muted transition-all group">
 <div className="flex-1 flex items-center gap-8">
 <span className="text-xs font-bold text-muted-foreground w-10">0{post.id}</span>
 <div className="flex-1">
 <h4 className="text-sm font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{post.title}</h4>
 <div className="flex items-center gap-4 mt-1">
 <span className="text-xs font-bold text-muted-foreground">{post.author}</span>
 <span className="text-xs font-medium text-muted-foreground underline decoration-border">#Enterprise</span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-8">
 <div className="text-right">
 <p className="text-xs font-bold text-muted-foreground">{post.date}</p>
 <p className="text-xs font-bold text-muted-foreground">PUBLIC_CONTENT</p>
 </div>
 <MoreHorizontal size={16} className="text-muted-foreground" />
 </div>
 </div>
 ))}
 </div>
 );
}

function GalleryLayout({ posts }: { posts: PreviewPost[] }) {
 return (
 <div className="grid grid-cols-1 gap-8">
 {posts.map(post => (
 <div key={post.id} className="group overflow-hidden rounded-lg bg-card border-2 border-border shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2">
 <div className="h-48 overflow-hidden relative">
 {/*
   [2026-08-29] 예시 이미지(unsplash) 제거. 미리보기의 목적은 레이아웃 확인이지 사진이
   아니고, 관리자 화면이 외부 호스트로 나갈 이유가 없다.
 */}
 <div aria-hidden="true" className="absolute inset-0 bg-muted" />
 <div className="absolute top-4 right-4 px-4 py-1.5 bg-surface-inverse/90 backdrop-blur-md rounded-lg text-surface-inverse-foreground text-xs font-bold tracking-widest uppercase">INSIGHT</div>
 </div>
 <div className="p-8 space-y-6">
 <h4 className="text-xl font-bold text-foreground tracking-tighter leading-snug">{post.title}</h4>
 <div className="flex items-center justify-between pt-4 border-t border-border">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground font-bold text-xs ">OP</div>
 <span className="text-xs font-bold text-foreground">{post.author}</span>
 </div>
 <div className="flex gap-4">
 <Share2 size={14} className="text-muted-foreground" />
 <ThumbsUp size={14} className="text-muted-foreground" />
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 );
}

function QnaLayout({ posts }: { posts: PreviewPost[] }) {
 return (
 <div className="space-y-4">
 {posts.map((post, idx) => (
 <div key={post.id} className="p-6 bg-card border-2 border-border rounded-lg flex gap-6 hover:border-amber-500 transition-all group">
 <div className="flex flex-col items-center gap-1 min-w-[60px]">
 <div className={cn(
 "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl shadow-inner",
 idx === 0 ? "bg-amber-100 text-amber-600 border-2 border-amber-200" : "bg-muted text-muted-foreground border border-border"
 )}>
 {idx === 0 ? <CheckCircle2 size={24} /> : '?' }
 </div>
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{idx === 0 ? 'Solved' : 'Open'}</span>
 </div>
 <div className="flex-1 space-y-2">
 <div className="flex items-center gap-3">
 <Badge className="bg-muted text-muted-foreground hover:bg-muted border-none text-xs font-bold">TECH_SUPPORT</Badge>
 <span className="text-xs font-bold text-muted-foreground">{post.date}</span>
 </div>
 <h4 className="text-lg font-bold text-foreground leading-tight group-hover:text-amber-600 transition-colors uppercase tracking-tighter">{post.title}</h4>
 <div className="flex items-center gap-4 text-muted-foreground font-bold text-xs">
 <span className="flex items-center gap-1"><User size={12} /> {post.author}</span>
 <span className="flex items-center gap-1"><MessageSquare size={12} /> {post.comments} Answers</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 );
}

function FaqLayout({ posts }: { posts: PreviewPost[] }) {
 return (
 <div className="space-y-4">
 {posts.slice(0, 3).map((post, idx) => (
 <Card key={idx} className="border-2 border-border overflow-hidden rounded-lg hover:border-hub-purple transition-all group">
 <div className="p-6 flex items-center justify-between">
 <div className="flex items-center gap-6">
 <div className={cn(
 "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl transition-all",
 idx === 0 ? "bg-hub-purple text-white shadow-lg" : "bg-muted text-muted-foreground"
 )}>
 Q
 </div>
 <h4 className="font-bold text-foreground text-lg uppercase tracking-tight ">{post.title}</h4>
 </div>
 <ChevronDown className="w-6 h-6 text-muted-foreground" />
 </div>
 {idx === 0 && (
 <div className="px-24 pb-10">
 <div className="p-8 bg-muted rounded-lg border-l-8 border-hub-purple text-muted-foreground font-medium leading-relaxed">
 {post.content}
 </div>
 </div>
 )}
 </Card>
 ))}
 </div>
 );
}

function WikiLayout({ posts }: { posts: PreviewPost[] }) {
 return (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {posts.map((post, idx) => (
 <Card key={idx} className="group overflow-hidden border-2 border-border hover:border-slate-900 transition-all rounded-lg">
 <div className="flex">
 <div className="w-16 bg-muted flex items-center justify-center shrink-0 border-r border-border group-hover:bg-surface-inverse group-hover:text-surface-inverse-foreground transition-colors">
 <Book size={24} className="opacity-40" />
 </div>
 <div className="p-8 space-y-4">
 <h4 className="text-xl font-bold text-foreground uppercase tracking-tighter group-hover:text-primary transition-colors">{post.title}</h4>
 <p className="text-sm text-muted-foreground font-bold tracking-widest uppercase">Last modified by {post.author}</p>
 </div>
 </div>
 </Card>
 ))}
 </div>
 );
}

function CalendarLayout() {
 const days = Array.from({ length: 35 }, (_, i) => i + 1 - 3); // Simple offset for preview
 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center bg-muted p-6 rounded-lg border-2 border-border">
 <h4 className="text-xl font-bold tracking-tighter text-foreground uppercase">May 2024</h4>
 <div className="flex gap-2">
 <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground"><ChevronRight className="rotate-180" size={16} /></div>
 <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground"><ChevronRight size={16} /></div>
 </div>
 </div>
 <div className="grid grid-cols-7 gap-2">
 {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
 <div key={d} className="text-xs font-bold text-muted-foreground text-center pb-2 tracking-widest">{d}</div>
 ))}
 {days.map((day, i) => (
 <div key={i} className={cn(
 "h-24 p-2 border-2 border-border rounded-lg transition-all relative group overflow-hidden",
 day === 20 ? "bg-primary/5 border-primary/20" : "bg-card",
 day <= 0 || day > 31 ? "opacity-10" : "hover:border-foreground"
 )}>
 <span className={cn("text-xs font-bold", day === 20 ? "text-primary" : "text-muted-foreground")}>
 {day > 0 && day <= 31 ? day : ''}
 </span>
 {day === 20 && (
 <div className="mt-2 p-1.5 bg-primary text-primary-foreground text-xs font-bold leading-tight rounded-sm shadow-lg shadow-primary/20 animate-in fade-in slide-in-from-bottom-2">
 EGOV_TECH_SEMINAR_4.0
 </div>
 )}
 {day === 21 && (
 <div className="mt-1 p-1.5 bg-surface-inverse text-surface-inverse-foreground text-xs font-bold leading-tight rounded-sm">
 MAINTENANCE_LOG
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 );
}

