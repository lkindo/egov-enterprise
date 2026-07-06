import React from 'react';
import { cn } from "@/lib/utils";

interface StandardFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  action?: any;
  className?: string;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
}

export function StandardForm({
  children,
  onSubmit,
  action,
  className,
  title,
  description,
  footer
}: StandardFormProps) {
  return (
    <div className={cn("bg-card border border-border rounded-lg shadow-sm overflow-hidden", className)}>
      {(title || description) && (
        <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
          {title ? <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3> : null}
          {description ? <p className="text-xs font-medium text-muted-foreground mt-1 leading-relaxed">{description}</p> : null}
        </div>
      )}

      <form onSubmit={onSubmit} action={action} className="p-6 space-y-4">
        <div className="grid gap-5">
          {children}
        </div>

        {footer && (
          <div className="pt-6 border-t border-border/50 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </form>
    </div>
  );
}

/**
 * Helper for form fields
 */
export function FormField({
  label,
  htmlFor,
  error,
  children,
  required,
  description
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  description?: string;
}) {
  return (
    <div className="space-y-1.5 p-0.5">
      <label htmlFor={htmlFor} className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
        {label}
        {required ? <span className="text-rose-500 font-bold text-xs" aria-hidden="true">*</span> : null}
      </label>
      <div className="relative">
        {children}
      </div>
      {error ? <p id={`${htmlFor}-error`} role="alert" className="text-xs font-bold text-rose-600 px-1 mt-1">{error}</p> : null}
      {description ? <p id={`${htmlFor}-description`} className="text-xs font-bold text-slate-500 px-1 mt-1 leading-relaxed">{description}</p> : null}
    </div>
  );
}
