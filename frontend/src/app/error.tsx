'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw, Home, MessageSquare } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function Error({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 useEffect(() => {
 // ?먮윭 濡쒓렇 湲곕줉 (?ㅼ젣 ?쒕퉬?ㅼ뿉?쒕뒗 Sentry ?깆뿉 ?꾩넚)
 console.error('Global Error:', error);
 }, [error]);

 return (
 <div className="min-h-[80vh] flex items-center justify-center p-6 relative overflow-hidden">
 {/* Background Decor */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-destructive/5 rounded-full blur-[120px] -z-10" />

 <div className="max-w-lg w-full bg-background/60 backdrop-blur-2xl border-2 border-destructive/10 rounded-[3.5rem] p-12 shadow-2xl shadow-destructive/5 text-center space-y-8 animate-in slide-in-from-bottom-8 duration-700">
 <div className="w-24 h-24 bg-destructive/10 rounded-[2.5rem] flex items-center justify-center mx-auto animate-bounce duration-[3000ms]">
 <AlertCircle className="text-destructive" size={44} />
 </div>

 <div className="space-y-4">
 <h1 className="text-3xl font-black tracking-tighter text-foreground">?쒖뒪님?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎</h1>
 <p className="text-muted-foreground font-medium leading-relaxed">
 ?쇱떆?곸씤 ?ㅻ쪟?닿굅님泥섎━ 以?臾몄젣媛 諛쒖깮?덉뒿?덈떎.<br />
 ?섏씠吏瑜님덈줈怨좎묠?섍굅님?좎떆 님?ㅼ떆 ?쒕룄?댁＜?몄슂.
 </p>
 {error.digest && (
 <code className="block text-[10px] font-mono text-muted-foreground/50 bg-muted/30 py-1 px-2 rounded-md w-fit mx-auto mt-2">
 Error ID: {error.digest}
 </code>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
 <Button
 onClick={() => reset()}
 size="lg"
 className="rounded-2xl h-16 font-black bg-destructive hover:bg-destructive/90 text-white shadow-xl shadow-destructive/20 gap-2"
 >
 <RotateCcw size={20} /> ?ㅼ떆 ?쒕룄?섍린
 </Button>
 <Link
 href="/"
 className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-2xl h-16 font-bold border-2 border-primary/10 gap-2")}
 >
 <Home size={20} /> 硫붿씤?쇰줈 ?뚯븘媛湲? </Link>
 </div>

 <div className="pt-8 border-t border-destructive/5 flex flex-col items-center gap-2">
 <p className="text-sm text-muted-foreground font-bold">臾몄젣媛 吏?띾맂?ㅻ㈃ 湲곗닠 吏?먰님?臾몄쓽?섏꽭님</p>
 <Link
 href="/help"
 className={cn(buttonVariants({ variant: "link", size: "sm" }), "text-primary font-black gap-1")}
 >
 <MessageSquare size={14} /> 湲곗닠 吏님臾몄쓽?섍린
 </Link>
 </div>
 </div>
 </div>
 );
}

