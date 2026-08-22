import Link from "next/link";

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
          <p className="text-balance text-xs font-bold leading-relaxed text-muted-foreground tracking-tight">
            &copy; 2026 전자정부 프레임워크 현대화 프로젝트.
          </p>
          <p className="text-xs font-bold text-muted-foreground tracking-tight">
            전사 업무와 협업 기능을 위한 포털
          </p>
        </div>
        {/*
          '이용약관'·'개인정보처리방침' 링크는 연결할 원문이 없어 제거했다(전부 href="#" 死링크였다).
          - 약관: tb_plcy_manage 에 해당 정책 행 자체가 없다(현재 COPYRIGHT/PRIVACY 2건뿐).
          - 개인정보처리방침: /help/policies/[type] 화면은 있으나, 데이터 출처가 관리자 전용
            /api/v1/admin/system/policies/** (ApiSecurityConfig: ROLE_ADMIN·ROLE_SYSTEM 한정)라
            일반 사용자에겐 "불러올 수 없습니다" 폴백만 보이고, 저장된 본문도 아직 자리표시 문구다.
          되살릴 때: 정책 본문을 채우고 공개(비관리자) 조회 경로를 연 뒤
          <Link href="/help/policies/PRIVACY"> 로 연결한다(PK 가 대문자라 대소문자 일치 필수).
        */}
        <div className="flex items-center gap-8 text-xs font-bold text-muted-foreground tracking-tight">
          <Link href="/help" className="hover:text-primary hover:opacity-100 transition-all font-bold">고객지원</Link>
        </div>
      </div>


    </footer>
  );
}
