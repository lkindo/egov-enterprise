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
 * 대량의 데이터를 효율적으로 보여주기 위한 가상화 리스트
 */
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

 const start번호 = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
 const end번호 = Math.min(items.length - 1, Math.floor((scrollTop + containerHeight) / itemHeight) + 2);

 const visibleItems = [];
 for (let i = start번호; i <= end번호; i++) {
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
 className={cn("overflow-y-auto border rounded-xl relative", className)}
 style={{ height: containerHeight }}
 >
 <div style={{ height: items.length * itemHeight, width: '100%' }}>
 {visibleItems}
 </div>
 </div>
 );
}
