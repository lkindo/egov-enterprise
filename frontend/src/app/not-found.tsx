'use client';

import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotFound() {
 return (
 <div className="min-h-[80vh] flex items-center justify-center p-6 relative overflow-hidden">
 {/* Background Orbs */}
 <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -z-10" />
 <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] -z-10" />

 <div className="max-w-md w-full bg-background/60 backdrop-blur-xl border-2 border-primary/5 rounded-[3rem] p-10 shadow-2xl shadow-primary/5 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
 <div className="relative inline-block">
 <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto rotate-6">
 <Search className="text-primary" size={40} />
 </div>
 <div className="absolute -bottom-2 -right-2 bg-destructive text-white text-sm font-black px-3 py-1 rounded-full shadow-lg">
 404
 </div>
 </div>

 <div className="space-y-3">
 <h1 className="text-3xl font-black tracking-tighter text-foreground">湲몄쓣 ?껋쑝?⑤굹님</h1>
 <p className="text-muted-foreground font-medium leading-relaxed">
 요청?섏떊 ?섏씠吏瑜?李얠쓣 님?놁뒿?덈떎.<br />
 二쇱냼媛 ?뺥솗?쒖? ?ㅼ떆 ?쒕쾲 ?뺤씤?댁＜?몄슂.
 </p>
 </div>

 <div className="grid grid-cols-2 gap-4 pt-4">
 <Link
 href="javascript:history.back()"
 className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-2xl h-14 font-bold border-2 gap-2")}
 >
 <ArrowLeft size={18} /> ?댁쟾?쇰줈
 </Link>
 <Link
 href="/"
 className={cn(buttonVariants({ size: "lg" }), "rounded-2xl h-14 font-black shadow-xl shadow-primary/20 gap-2")}
 >
 <Home size={18} /> ?덉쑝濡님대룞
 </Link>
 </div>

 <div className="pt-6 text-[10px] text-muted-foreground font-bold tracking-tight opacity-30">
 Electronic Government Modernization Project
 </div>
 </div>
 </div>
 );
}

