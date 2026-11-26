import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * 브라우저 기본 select 의 디자인 시스템 래퍼(2026-11-26 품질 평가 PR-3b 6번).
 *
 * <p>화면마다 높이·모서리·배경·글자 크기·초점 고리를 따로 적어 왔고, 초점 고리가 없는 곳도 있었다(키보드 사용자가 위치를 잃는다,
 * WCAG 2.4.7). 기본 모양은 Input 과 같은 결로 여기 한 곳에 두고, 화면은 폭·배치만 덧붙인다(같은 성질의 클래스는 호출부가 이긴다).
 * 경계는 3:1 을 보장한 border-input 이다(status-token-contrast 계약). 목록이 짧고 브라우저 기본 동작(모바일 선택기·키보드 탐색)이
 * 나은 자리에 쓴다 — 검색·여러 선택이 필요하면 Radix Select 를 쓴다.
 */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
 ({ className, ...props }, ref) => {
 return (
 // eslint-disable-next-line no-restricted-syntax -- 디자인 시스템 래퍼 자신이다(화면은 이 부품을 쓴다).
 <select
 data-slot="native-select"
 className={cn(
 "h-[var(--control-h)] min-w-0 rounded-md border border-input bg-background px-3 text-[length:var(--font-size-body)] text-foreground shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50",
 "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
 "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive-emphasis",
 className
 )}
 ref={ref}
 {...props}
 />
 )
 }
)
NativeSelect.displayName = "NativeSelect"

export { NativeSelect }
