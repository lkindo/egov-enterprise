export function Footer() {
  return (
    <footer className="border-t py-6 px-4 md:px-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row container mx-auto">
        <p className="text-balance text-center text-[11px] font-semibold leading-relaxed text-muted-foreground/60 md:text-left">
          &copy; 2026 전자정부 현대화 프로젝트 (eGov 5.0). All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-[11px] font-bold text-muted-foreground/50">
          <a href="#" className="hover:text-primary transition-colors">이용약관</a>
          <a href="#" className="hover:text-primary transition-colors">개인정보처리방침</a>
          <a href="#" className="hover:text-primary transition-colors">고객지원</a>
        </div>
      </div>
    </footer>
  );
}
