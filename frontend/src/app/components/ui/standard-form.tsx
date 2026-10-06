import React from 'react';

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
      <label htmlFor={htmlFor} className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">
        {label}
        {required ? <span className="text-rose-500 font-bold text-xs" aria-hidden="true">*</span> : null}
      </label>
      <div className="relative">
        {children}
      </div>
      {error ? <p id={`${htmlFor}-error`} className="text-xs font-bold text-destructive-emphasis px-1 mt-1">{error}</p> : null}
      {description ? <p id={`${htmlFor}-description`} className="text-xs font-bold text-muted-foreground px-1 mt-1 leading-relaxed">{description}</p> : null}
    </div>
  );
}
