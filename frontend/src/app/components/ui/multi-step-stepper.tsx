'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  label: string;
}

interface MultiStepStepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function MultiStepStepper({ steps, currentStep, className }: MultiStepStepperProps) {
  return (
    <div className={cn("flex items-center justify-between w-full max-w-2xl mx-auto mb-12", className)}>
      {steps.map((step, idx) => (
        <React.Fragment key={step.id}>
          {/* Step Circle */}
          <div className="flex flex-col items-center gap-2 relative">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
              currentStep === step.id ? "bg-primary border-primary text-primary-foreground shadow-md scale-110" :
              currentStep > step.id ? "bg-green-500 border-green-500 text-white" :
              "bg-background border-muted text-muted-foreground"
            )}>
              {currentStep > step.id ? <Check size={20} strokeWidth={3} /> : step.id}
            </div>
            <span className={cn(
              "absolute top-12 whitespace-nowrap text-xs font-bold",
              currentStep === step.id ? "text-foreground" : "text-muted-foreground"
            )}>
              {step.label}
            </span>
          </div>

          {/* Line */}
          {idx < steps.length - 1 && (
            <div className="flex-1 h-[2px] mx-4 bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: currentStep > step.id ? '100%' : '0%' }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
