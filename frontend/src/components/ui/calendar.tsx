"use client"

import * as React from "react"

import { DayButton, DayPicker, type DayButtonProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type CalendarProps = React.ComponentProps<typeof DayPicker>

const WEEKDAY = new Intl.DateTimeFormat("ko-KR", { weekday: "long" })

/**
 * 날짜 단추의 이름은 내용으로 만든다(2026-11-14 원점 평가, 일정 화면 axe). react-day-picker 는 `aria-label`
 * ("2026년 11월 14일 금요일" 꼴, 오늘·선택은 영어 "Today, … selected")을 붙이는데, 보이는 숫자 "14" 가 그 이름의 낱말이 아니라
 * ("14일" 이 한 낱말이다) WCAG 2.5.3(label-content-name-mismatch)에 걸렸다. 보이는 숫자 뒤에 화면에는 보이지 않는 보충 글자를 붙여
 * 이름을 "14일 금요일, 2026년 11월, 오늘" 처럼 보이는 글자로 시작하게 한다.
 */
function CalendarDayButton({ "aria-label": _label, children, ...props }: DayButtonProps) {
  const { date } = props.day
  const state = `${props.modifiers.today ? ", 오늘" : ""}${props.modifiers.selected ? ", 선택됨" : ""}`
  return (
    <DayButton {...props}>
      {children}
      <span className="sr-only">{`일 ${WEEKDAY.format(date)}, ${date.getFullYear()}년 ${date.getMonth() + 1}월${state}`}</span>
    </DayButton>
  )
}

function Calendar({
 className,
 classNames,
 showOutsideDays = true,
 ...props
}: CalendarProps) {
 return (
 <DayPicker
 showOutsideDays={showOutsideDays}
 className={cn("p-3", className)}
 classNames={{
 months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
 month: "space-y-4",
 month_caption: "flex justify-center pt-1 relative items-center h-7",
 caption_label: "text-sm font-medium",
 nav: "flex items-center",
 button_previous: cn(
   buttonVariants({ variant: "outline" }),
   "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
   "absolute left-1 top-1"
 ),
 button_next: cn(
   buttonVariants({ variant: "outline" }),
   "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
   "absolute right-1 top-1"
 ),
 month_grid: "w-full border-collapse space-y-1",
 weekdays: "flex",
 weekday:
 "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
 week: "flex w-full mt-2",
 day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
 day_button: cn(
 buttonVariants({ variant: "ghost" }),
 "e2e-day-button",
 "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
 ),
 range_end: "day-range-end",
 selected:
 "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
 today: "bg-accent text-accent-foreground",
 outside:
 "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
 disabled: "text-muted-foreground opacity-50",
 range_middle:
 "aria-selected:bg-accent aria-selected:text-accent-foreground",
 hidden: "invisible",
 ...classNames,
 }}
 {...props}
 components={{ DayButton: CalendarDayButton, ...props.components }}
 />
 )
}
Calendar.displayName = "Calendar"

export { Calendar }
