'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, UserPlus, FileText, CheckCircle2, Clock } from 'lucide-react';

const activities = [
 {
 id: 1,
 type: 'post',
 user: '?ê¸¸??,
 action: '??ê³µì??¬í•­???±ë¡?ˆìŠµ?ˆë‹¤.',
 target: '2026???ë°˜ê¸??œìŠ¤???ê? ?ˆë‚´',
 time: '10ë¶???,
 icon: <MessageSquare size={14} className="text-blue-500" />,
 bg: 'bg-blue-50'
 },
 {
 id: 2,
 type: 'user',
 user: '?œìŠ¤??,
 action: '?ˆë¡œ???¬ìš©?ê? ?¹ì¸?˜ì—ˆ?µë‹ˆ??',
 target: '?´ìˆœ??ê³¼ì¥ (?ì—…ì§€?í?)',
 time: '1?œê°„ ??,
 icon: <UserPlus size={14} className="text-green-500" />,
 bg: 'bg-green-50'
 },
 {
 id: 3,
 type: 'file',
 user: 'ê¹€ì² ìˆ˜',
 action: '?Œì¼???…ë¡œ?œí–ˆ?µë‹ˆ??',
 target: 'ê²°ê³¼ë³´ê³ ??v1.2.pdf',
 time: '3?œê°„ ??,
 icon: <FileText size={14} className="text-orange-500" />,
 bg: 'bg-orange-50'
 },
 {
 id: 4,
 type: 'task',
 user: 'ë°•ì???,
 action: '?…ë¬´ë¥??„ë£Œë¡??œì‹œ?ˆìŠµ?ˆë‹¤.',
 target: '?”ì??ê°€?´ë“œ?¼ì¸ ê²€??,
 time: '?´ì œ',
 icon: <CheckCircle2 size={14} className="text-purple-500" />,
 bg: 'bg-purple-50'
 }
];

export function ActivityFeed() {
 return (
 <div className="space-y-6">
 {activities.map((activity, idx) => (
 <div key={`activity-${activity.id}`} className="relative flex gap-4">
 {/* Timeline Line */}
 {idx !== activities.length - 1 && (
 <div className="absolute left-[17px] top-9 bottom-[-24px] w-px bg-slate-200" />
 )}

 <div className={cn(
 "w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10",
 activity.bg
 )}>
 {activity.icon}
 </div>

 <div className="flex flex-col gap-0.5 pb-2">
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold text-foreground">{activity.user}</span>
 <span className="text-sm text-muted-foreground">{activity.action}</span>
 </div>
 <p className="text-sm font-medium text-primary hover:underline cursor-pointer">
 {activity.target}
 </p>
 <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
 <Clock size={10} />
 {activity.time}
 </div>
 </div>
 </div>
 ))}
 </div>
 );
}
