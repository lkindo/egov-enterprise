'use client';

import React from 'react';
import { Check, Clock, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  // Calculate completion percentage for the progress line
  const completedCount = steps.filter(s => s.status === 'completed' || s.status === 'rejected').length;
  const progressPercentage = (completedCount / (steps.length - 1)) * 100;

  return (
    <div className="w-full py-12 px-4">
      <div className="relative flex justify-between items-start max-w-5xl mx-auto">
        {/* Background Connection Line */}
        <div className="absolute top-6 left-0 w-full h-[3px] bg-muted dark:bg-slate-800 rounded-lg -z-10" />
        
        {/* Active Progress Line */}
        <motion.div 
          className="absolute top-6 left-0 h-[3px] bg-gradient-to-r from-primary to-hub-purple rounded-lg -z-10"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.8, ease: "circOut" }}
        />

        {steps.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isRejected = step.status === 'rejected';
          const isCurrent = step.status === 'current';
          const isPending = step.status === 'pending';

          return (
            <div key={`step-${idx}`} className="relative flex flex-col items-center flex-1 group">
              {/* Step Marker Container */}
              <div className="relative flex items-center justify-center">
                <AnimatePresence>
                  {isCurrent && (
                    <motion.div
                      layoutId="active-ring"
                      className="absolute w-16 h-11 rounded-lg bg-primary/10 border-2 border-primary/20"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                </AnimatePresence>

                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all duration-500 z-10 shadow-xl border-4",
                    isCompleted ? "bg-emerald-500 border-emerald-100 dark:border-emerald-900/30 text-white" :
                    isRejected ? "bg-rose-500 border-rose-100 dark:border-rose-900/30 text-white" :
                    isCurrent ? "bg-slate-900 border-white dark:border-slate-800 text-white" :
                    "bg-white dark:bg-slate-900 border-border dark:border-slate-800 text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check size={20} strokeWidth={3} /> :
                  isRejected ? <X size={20} strokeWidth={3} /> :
                  isCurrent ? <Clock size={20} className="animate-spin-slow" /> :
                  <User size={20} />}
                </motion.div>
              </div>

              {/* Step Information */}
              <motion.div 
                className="mt-6 text-center space-y-1.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <p className={cn(
                  "text-xs font-bold tracking-[0.2em] uppercase",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}>
                  STEP {idx + 1}
                </p>
                <h4 className={cn(
                  "text-sm font-bold tracking-tight",
                  isCurrent ? "text-foreground dark:text-white" : "text-muted-foreground dark:text-muted-foreground"
                )}>
                  {step.label}
                </h4>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-foreground dark:text-slate-300 flex items-center gap-1">
                    <User size={10} className="opacity-50" />
                    {step.user}
                  </span>
                  {step.date && (
                    <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mt-1">
                      {step.date}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Status Badge */}
              <AnimatePresence>
                {isCurrent && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-8 px-3 py-1 bg-primary rounded-lg shadow-lg shadow-primary/20"
                  >
                    <span className="text-xs font-bold text-white tracking-widest uppercase">Active</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
