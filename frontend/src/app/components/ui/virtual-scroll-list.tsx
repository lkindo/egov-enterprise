'use client';

import React, { useRef,  useState } from 'react';
import { cn } from '@/lib/utils';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

/**
 * 대량의 데이터를 효율적으로 보여주기 위한 가상화 리스트 컴포넌트
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

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(items.length - 1, Math.floor((scrollTop + containerHeight) / itemHeight) + 2);

  const visibleItems = [];
  // 보이는 구간 [startIndex, endIndex] 를 잘라 돈다 — 종전 색인 반복과 같은 항목이며, 구간이 비면 아무것도 그리지 않는다.
  for (const [offset, item] of items.slice(startIndex, endIndex + 1).entries()) {
    const i = startIndex + offset;
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
        {renderItem(item, i)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={cn("overflow-y-auto border rounded-lg relative", className)}
      style={{ height: containerHeight }}
    >
      <div style={{ height: items.length * itemHeight, width: '100%' }}>
        {visibleItems}
      </div>
    </div>
  );
}
