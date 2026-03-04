export function Footer() {
  return (
    <footer className="border-t py-6 md:px-8 md:py-0 bg-background/95">
      <div className="flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row container mx-auto">
        <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
          &copy; 2026 전자정부 현대화 프로젝트. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a href="#" className="hover:underline underline-offset-4">이용약관</a>
          <a href="#" className="hover:underline underline-offset-4">개인정보처리방침</a>
        </div>
      </div>
    </footer>
  );
}