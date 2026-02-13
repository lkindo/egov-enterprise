'use client';

import React, { useState } from 'react';
import { GripVertical, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReorderableListProps<T> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  className?: string;
}

export function ReorderableList<T>({ 
  items, 
  onReorder, 
  renderItem, 
  keyExtractor,
  className 
}: ReorderableListProps<T>) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // 드래그 시 고스트 이미지 스타일을 위해 투명도 조절 등을 할 수 있습니다.
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    onReorder(newItems);
  };

  const onDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, idx) => (
        <li
          key={keyExtractor(item)}
          draggable
          onDragStart={(e) => onDragStart(e, idx)}
          onDragOver={(e) => onDragOver(e, idx)}
          onDragEnd={onDragEnd}
          className={cn(
            "flex items-center gap-3 p-3 border rounded-lg bg-card transition-all",
            draggedIndex === idx ? "opacity-40 scale-[0.98] border-primary shadow-inner" : "hover:shadow-md",
            "cursor-grab active:cursor-grabbing"
          )}
        >
          <GripVertical size={18} className="text-muted-foreground shrink-0" />
          <div className="flex-1 overflow-hidden">
            {renderItem(item)}
          </div>
        </li>
      ))}
    </ul>
  );
}
