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
    <div className={cn("bg-card border rounded-xl shadow-sm overflow-hidden", className)}>
      {(title || description) && (
        <div className="px-6 py-5 border-b bg-muted/20">
          {title ? <h3 className="text-lg font-bold text-foreground">{title}</h3> : null}
          {description ? <p className="text-sm text-muted-foreground mt-1">{description}</p> : null}
        </div>
      )}

      <form onSubmit={onSubmit} action={action} className="p-6 space-y-6">
        <div className="grid gap-6">
          {children}
        </div>

        {footer && (
          <div className="pt-6 border-t flex justify-end gap-3">
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
  error,
  children,
  required
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground flex items-center gap-1">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
