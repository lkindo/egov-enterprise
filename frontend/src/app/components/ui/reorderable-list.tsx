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
 const [dragged踰덊샇, setDragged踰덊샇] = useState<number | null>(null);

 const onDragStart = (e: React.DragEvent, index: number) => {
 setDragged踰덊샇(index);
 e.dataTransfer.effectAllowed = 'move';
 // ?쒕옒洹님怨좎뒪님?대吏 ㅽ님쇱쓣 ?꾪빐 щ챸님議곗젅 ?깆쓣 ...있습니다.
 };

 const onDragOver = (e: React.DragEvent, index: number) => {
 e.preventDefault();
 if (dragged踰덊샇 === null || dragged踰덊샇 === index) return;

 const newItems = [...items];
 const draggedItem = newItems[dragged踰덊샇];
 newItems.splice(dragged踰덊샇, 1);
 newItems.splice(index, 0, draggedItem);

 setDragged踰덊샇(index);
 onReorder(newItems);
 };

 const onDragEnd = () => {
 setDragged踰덊샇(null);
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
 dragged踰덊샇 === idx ? "opacity-40 scale-[0.98] border-primary shadow-inner" : "hover:shadow-md",
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

