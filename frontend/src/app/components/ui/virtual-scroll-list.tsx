'use client';

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VirtualScrollListProps<T> {
 items: T[];
 itemHeight: number;
 containerHeight: number;
 renderItem: (item: T, index: number) => React.ReactNode;
 className?: string;
}

/**
 * 됱쓽 ?곗씠?곕? ⑥쑉?곸쑝濡蹂댁뿬二쇨린 ?꾪븳 媛곹솕 由ъ뒪님 */
export function VirtualScrollList<T>({
 items,
 itemHeight,
 containerHeight,
 renderItem,
 className
}: VirtualScrollListProps<T>) {
 const containerRef = useRef<HTMLDivElement>(null);
 const [scrollTop, setScrollTop] = useState(0);

 const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
 setScrollTop(e.currentTarget.scrollTop);
 };

 const start踰덊샇 = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
 const end踰덊샇 = Math.min(items.length - 1, Math.floor((scrollTop + containerHeight) / itemHeight) + 2);

 const visibleItems = [];
 for (let i = start踰덊샇; i <= end踰덊샇; i++) {
 visibleItems.push(
 <div
 key={i}
 style={{
 position: 'absolute',
 top: i * itemHeight,
 width: '100%',
 height: itemHeight
 }}
 >
 {renderItem(items[i], i)}
 </div>
 );
 }

 return (
 <div
 ref={containerRef}
 onScroll={onScroll}
 className={cn("overflow-y-auto border rounded-[0.1rem] relative", className)}
 style={{ height: containerHeight }}
 >
 <div style={{ height: items.length * itemHeight, width: '100%' }}>
 {visibleItems}
 </div>
 </div>
 );
}

