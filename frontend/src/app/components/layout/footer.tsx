import Link from "next/link";

import { cn } from "@/lib/utils";
import { SITE_IDENTITY } from "@/config/site-identity";
import { visibleEntries, type ShellLink } from "@/extensions/slots";
import { shellLinks } from "@/extensions/generated-shell-links";


interface FooterProps {
  className?: string;
}

// 셸 링크 슬롯에서 바닥글 배치만 고른다.
const isFooterShellLink = (link: ShellLink) => link.placement === "footer";

export function Footer({ className }: FooterProps) {
  // 서버 컴포넌트라 로그인 주체를 모른다(주체 null). 바닥글 항목은 /admin 밖 목적지만 두므로(경계 계약) 판정이 주체와 무관하다.
  const footerShellLinks = visibleEntries(null, shellLinks, isFooterShellLink);
  return (
    <footer className={cn("border-t py-4 px-4 md:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className={cn(
        "flex flex-col items-center justify-between gap-2 md:flex-row max-w-7xl mx-auto",
      )}>
        <div className="flex flex-col gap-1 text-center md:text-left">
          <p className="text-balance text-xs font-bold leading-relaxed text-muted-foreground tracking-tight">
            {SITE_IDENTITY.copyright}
          </p>

        </div>
        {/*
          '이용약관'·'개인정보처리방침' 링크는 연결할 원문이 없어 제거했다(전부 href="#" 死링크였다).
          - 약관: tb_plcy_manage 에 해당 정책 행 자체가 없다(현재 COPYRIGHT/PRIVACY 2건뿐).
          - 개인정보처리방침: /help/policies/[type] 화면은 있으나, 데이터 출처가 관리자 전용
            /api/v1/admin/system/policies/** (ApiSecurityConfig: ROLE_ADMIN·ROLE_SYSTEM 한정)라
            일반 사용자에겐 "불러올 수 없습니다" 폴백만 보이고, 저장된 본문도 아직 자리표시 문구다.
          되살릴 때: 정책 본문을 채우고 공개(비관리자) 조회 경로를 연 뒤
          <Link href="/help/policies/PRIVACY"> 로 연결한다(PK 가 대문자라 대소문자 일치 필수). 바닥글 링크는 이 파일에 직접 두지 않고
          셸 링크 슬롯(shell-links) 항목으로 두며, 같은 기여 안에 같은 목적지의 머리글 짝이 있어야 한다(경계 계약).
        */}
        {footerShellLinks.length > 0 && (
          <div className="flex items-center gap-8 text-xs font-bold text-muted-foreground tracking-tight">
            {footerShellLinks.map(({ id, href, label }) => (
              <Link key={id} href={href} className="hover:text-primary hover:opacity-100 transition-all font-bold">{label}</Link>
            ))}
          </div>
        )}
      </div>


    </footer>
  );
}
