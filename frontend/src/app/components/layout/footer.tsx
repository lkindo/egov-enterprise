import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn("border-t py-8 px-4 md:px-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className={cn(
        "flex flex-col items-center justify-between gap-6 md:flex-row max-w-7xl mx-auto",
        // layout.tsx?êÏÑú ?¥Î? max-w-7xl???∞Í≥† ?àÏúºÎØÄÎ°??ºÍ????†Ï?
      )}>
        <div className="flex flex-col gap-1 text-center md:text-left">
          <p className="text-balance text-[11px] font-black leading-relaxed text-muted-foreground/30 uppercase tracking-[0.1em]">
            &copy; 2026 EGOV ENTERPRISE MODERNIZATION PROJECT.
          </p>
          <p className="text-[9px] font-bold text-muted-foreground/20">
            Powered by Modern KRDS Architecture & Antigravity AI
          </p>
        </div>
        <div className="flex items-center gap-8 text-[11px] font-black text-muted-foreground/30 uppercase tracking-widest">
          <a href="#" className="hover:text-primary hover:opacity-100 transition-all">?¥Ïö©?ΩÍ?</a>
          <a href="#" className="hover:text-primary hover:opacity-100 transition-all">Í∞úÏù∏?ïÎ≥¥Ï≤òÎ¶¨Î∞©Ïπ®</a>
          <a href="#" className="hover:text-primary hover:opacity-100 transition-all">Í≥†Í∞ùÏßÄ??/a>
        </div>
      </div>
    </footer>
  );
}
