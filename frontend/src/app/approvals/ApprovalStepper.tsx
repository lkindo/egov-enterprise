'use client';

import React from 'react';
import { Check, Clock, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
 label: string;
 user: string;
 status: 'pending' | 'completed' | 'rejected' | 'current';
 date?: string;
}

interface ApprovalStepperProps {
 steps: Step[];
}

export function ApprovalStepper({ steps }: ApprovalStepperProps) {
 return (
 <div className="w-full py-8">
 <div className="relative flex justify-between">
 {/* Connection Line */}
 <div className="absolute top-5 left-0 w-full h-0.5 bg-muted -z-0" />

 {steps.map((step, idx) => {
 const isCompleted = step.status === 'completed';
 const isRejected = step.status === 'rejected';
 const isCurrent = step.status === 'current';

 return (
 <div key={`step-${idx}`} className="relative flex flex-col items-center group z-10 px-4 bg-transparent">
 {/* Icon Circle */}
 <div className={cn(
 "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg border-4 border-card",
 isCompleted ? "bg-emerald-500 text-white" :
 isRejected ? "bg-red-500 text-white" :
 isCurrent ? "bg-primary text-white scale-110 ring-4 ring-primary/20" :
 "bg-muted text-muted-foreground"
 )}>
 {isCompleted ? <Check size={18} /> :
 isRejected ? <X size={18} /> :
 isCurrent ? <Clock size={18} className="animate-spin-slow" /> :
 <User size={18} />}
 </div>

 {/* Label */}
 <div className="mt-4 text-center space-y-1">
 <p className={cn(
 "text-sm font-black tracking-tight",
 isCurrent ? "text-primary" : "text-muted-foreground"
 )}>
 {step.label}
 </p>
 <p className="text-sm font-bold text-foreground">{step.user}</p>
 {step.date && (
 <p className="text-[10px] font-medium text-muted-foreground opacity-60 ">{step.date}</p>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}
