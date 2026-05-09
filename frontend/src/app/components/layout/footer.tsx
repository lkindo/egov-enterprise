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
          <p className="text-balance text-xs font-bold leading-relaxed text-slate-600 tracking-tight">
            &copy; 2026 전자정부 프레임워크 현대화 프로젝트.
          </p>
          <p className="text-xs font-bold text-slate-600 tracking-tight">
            Modern KRDS 아키텍처 및 Antigravity AI 기반
          </p>
        </div>
        <div className="flex items-center gap-8 text-xs font-bold text-slate-600 tracking-tight">
          <a href="#" className="hover:text-primary hover:opacity-100 transition-all font-bold">이용약관</a>
          <a href="#" className="hover:text-primary hover:opacity-100 transition-all font-bold">개인정보처리방침</a>
          <a href="#" className="hover:text-primary hover:opacity-100 transition-all font-bold text-left">고객지원</a>
        </div>
      </div>


    </footer>
  );
}
