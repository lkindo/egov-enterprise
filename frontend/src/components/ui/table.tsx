"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function useOverflowRegion<T extends HTMLElement>(label: string, enabled = true) {
 const ref = React.useRef<T>(null)
 const [isOverflowing, setIsOverflowing] = React.useState(false)

 const measureOverflow = React.useCallback(() => {
  const element = ref.current
  if (!element || !enabled) {
   setIsOverflowing(false)
   return
  }

  setIsOverflowing(
   element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight
  )
 }, [enabled])

 React.useLayoutEffect(() => {
  const element = ref.current
  if (!element || !enabled) {
   measureOverflow()
   return
  }

  measureOverflow()
  const resizeObserver = typeof ResizeObserver === "undefined"
   ? null
   : new ResizeObserver(measureOverflow)

  const observeCurrentContent = () => {
   resizeObserver?.observe(element)
   if (element.firstElementChild instanceof HTMLElement) {
    resizeObserver?.observe(element.firstElementChild)
   }
   element.querySelectorAll("table").forEach((table) => resizeObserver?.observe(table))
  }

  observeCurrentContent()
  const mutationObserver = typeof MutationObserver === "undefined"
   ? null
   : new MutationObserver(() => {
    observeCurrentContent()
    measureOverflow()
   })
  mutationObserver?.observe(element, {
   childList: true,
   subtree: true,
   characterData: true,
  })
  window.addEventListener("resize", measureOverflow)

  return () => {
   mutationObserver?.disconnect()
   resizeObserver?.disconnect()
   window.removeEventListener("resize", measureOverflow)
  }
 }, [enabled, measureOverflow])

 return {
  ref,
  role: isOverflowing ? "region" as const : undefined,
  tabIndex: isOverflowing ? 0 : undefined,
  "aria-label": isOverflowing ? label : undefined,
 }
}

interface TableProps extends React.ComponentProps<"table"> {
 scrollRegionLabel?: string
}

function Table({ className, scrollRegionLabel = "표 스크롤 영역", ...props }: TableProps) {
 const scrollRegionProps = useOverflowRegion<HTMLDivElement>(scrollRegionLabel)

 return (
 <div
 data-slot="table-container"
 className="relative w-full overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
 {...scrollRegionProps}
 >
 <table
 data-slot="table"
 className={cn("w-full caption-bottom text-sm", className)}
 {...props}
 />
 </div>
 )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
 return (
 <thead
 data-slot="table-header"
 className={cn("[&_tr]:border-b", className)}
 {...props}
 />
 )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
 return (
 <tbody
 data-slot="table-body"
 className={cn("[&_tr:last-child]:border-0", className)}
 {...props}
 />
 )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
 return (
 <tfoot
 data-slot="table-footer"
 className={cn(
 "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
 className
 )}
 {...props}
 />
 )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
 return (
 <tr
 data-slot="table-row"
 className={cn(
 "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
 className
 )}
 {...props}
 />
 )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
 return (
 <th
 data-slot="table-head"
 className={cn(
 "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
 className
 )}
 {...props}
 />
 )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
 return (
 <td
 data-slot="table-cell"
 className={cn(
 "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
 className
 )}
 {...props}
 />
 )
}

function TableCaption({
 className,
 ...props
}: React.ComponentProps<"caption">) {
 return (
 <caption
 data-slot="table-caption"
 className={cn("text-muted-foreground mt-4 text-sm", className)}
 {...props}
 />
 )
}

export {
 useOverflowRegion,
 Table,
 TableHeader,
 TableBody,
 TableFooter,
 TableHead,
 TableRow,
 TableCell,
 TableCaption,
}
