export default function GlobalLoading() {
 return (
 <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-500">
 <div className="relative">
 {/* Animated Rings */}
 <div className="w-24 h-24 border-4 border-primary/20 rounded-full animate-pulse" />
 <div className="absolute top-0 left-0 w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin duration-700" />

 {/* Center Logo/Icon */}
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/40 rotate-12 animate-bounce">
 <span className="text-primary-foreground font-black text-sm">eG</span>
 </div>
 </div>
 </div>

 {/* Loading Text */}
 <div className="mt-8 flex flex-col items-center gap-2">
 <h3 className="text-xl font-black tracking-tighter text-primary">Modernizing Enterprise</h3>
 <div className="flex items-center gap-1.5">
 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_1s_infinite_0ms]" />
 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_1s_infinite_200ms]" />
 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_1s_infinite_400ms]" />
 </div>
 <p className="text-[10px] font-bold text-muted-foreground tracking-[0.3em] mt-2 opacity-50">Please wait a moment</p>
 </div>

 {/* Background Accent */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
 </div>
 );
}
