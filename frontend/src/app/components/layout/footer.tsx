import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn("border-t py-8 px-4 md:px-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className={cn(
        "flex flex-col items-center justify-between gap-6 md:flex-row max-w-7xl mx-auto",
      )}>
        <div className="flex flex-col gap-1 text-center md:text-left">
          <p className="text-balance text-[11px] font-black leading-relaxed text-slate-600 uppercase tracking-[0.1em]">
            &copy; 2026 EGOV ENTERPRISE MODERNIZATION PROJECT.
          </p>
          <p className="text-[9px] font-bold text-slate-600">
            Powered by Modern KRDS Architecture & Antigravity AI
          </p>
        </div>
        <div className="flex items-center gap-8 text-[11px] font-black text-slate-600 uppercase tracking-widest">
          <a href="#" className="hover:text-primary hover:opacity-100 transition font-bold">?댁슜?쎄?</a>
          <a href="#" className="hover:text-primary hover:opacity-100 transition font-bold">媛쒖씤?뺣낫泥섎━諛⑹묠</a>
          <a href="#" className="hover:text-primary hover:opacity-100 transition font-bold text-left">怨좉컼吏??/a>
        </div>
      </div>
    </footer>
  );
}
