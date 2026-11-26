import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
 "inline-flex items-center justify-center rounded-lg border border-transparent px-2 py-0.5 text-sm font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
 {
 variants: {
 variant: {
 default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
 secondary:
 "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
 destructive:
 "bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
 outline:
 "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
 ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
 link: "text-primary underline-offset-4 [a&]:hover:underline",
 success: "bg-success text-success-foreground [a&]:hover:bg-success/90 focus-visible:ring-success/20",
 info: "bg-info text-info-foreground [a&]:hover:bg-info/90",
 // 꺼짐·종료·미사용처럼 한 발 물러선 상태. muted 위 muted-foreground 는 두 프로필 모두 AA 다.
 muted: "bg-muted text-muted-foreground",
 // 연한(soft) 변형 — 표 칸·제목 옆처럼 채움 배지가 시끄러운 자리. 색은 틴트·테두리가 말하고 글자는 AA 가 계약된 토큰만 쓴다
 // (emphasis 는 자기 틴트 위 4.5:1 을, 나머지는 foreground 를 — status-token-contrast 계약).
 "success-soft": "border-success/40 bg-success/15 text-success-emphasis",
 "destructive-soft": "border-destructive/40 bg-destructive/15 text-destructive-emphasis",
 "warning-soft": "border-warning/40 bg-warning/15 text-foreground",
 "info-soft": "border-info/40 bg-info/15 text-foreground",
 "primary-soft": "border-primary/40 bg-primary/10 text-foreground",
 },
 size: {
 default: "",
 // 제목 옆·이름 옆에 붙는 작은 표지.
 sm: "rounded px-1.5 text-xs",
 },
 },
 defaultVariants: {
 variant: "default",
 size: "default",
 },
 }
)

function Badge({
 className,
 variant = "default",
 size = "default",
 asChild = false,
 children,
 ...props
}: React.ComponentProps<"span"> &
 VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
 const Comp = asChild ? Slot.Root : "span"

 return (
 <Comp
 data-slot="badge"
 data-variant={variant}
 className={cn(badgeVariants({ variant, size }), className)}
 {...props}
 >
 {asChild ? (
 React.Children.toArray(children).find((child) => React.isValidElement(child))
 ) : (
 children
 )}
 </Comp>
 )
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

export { Badge, badgeVariants, type BadgeVariant }
