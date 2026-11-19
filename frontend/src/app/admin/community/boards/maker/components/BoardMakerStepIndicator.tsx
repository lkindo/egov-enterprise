'use client';

import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface BoardMakerStepIndicatorProps {
  steps: readonly WizardStep[];
  currentStep: number;
}

export function BoardMakerStepIndicator({ steps, currentStep }: BoardMakerStepIndicatorProps) {
  return (
    <div className="relative px-4">
      <div className="absolute left-0 top-4 z-0 h-0.5 w-full bg-muted" aria-hidden="true" />
      <ol aria-label="게시판 만들기 단계" className="relative z-10 flex items-start justify-between">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <li key={step.id} aria-current={isActive ? 'step' : undefined} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-md border transition-colors',
                  isActive
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-success border-success text-success-foreground'
                      : 'bg-card border-border text-muted-foreground',
                )}
              >
                {isCompleted ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
              </div>
              <div className="text-center">
                <p className={cn('text-xs', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {step.id}단계{isCompleted && <span className="sr-only">(마침)</span>}
                </p>
                <p
                  className={cn(
                    'whitespace-nowrap text-[length:var(--font-size-body)] font-medium',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.title}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
