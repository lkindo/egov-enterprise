
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface ConfirmOptions {
 title: string;
 message: string;
 confirmText?: string;
 cancelText?: string;
 variant?: 'default' | 'destructive';
}

interface ConfirmContextType {
 confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
 const [isOpen, setIsOpen] = useState(false);
 const [options, setOptions] = useState<ConfirmOptions | null>(null);
 const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);
 // 다이얼로그를 연 요소(invoker)를 기억했다가 닫힐 때 포커스를 되돌린다 (DialogTrigger 부재 보완)
 const triggerRef = useRef<HTMLElement | null>(null);

 const confirm = useCallback((opts: ConfirmOptions) => {
 triggerRef.current = (document.activeElement as HTMLElement) ?? null;
 setOptions(opts);
 setIsOpen(true);
 return new Promise<boolean>((resolve) => {
 setResolver(() => resolve);
 });
 }, []);

 const handleConfirm = () => {
 setIsOpen(false);
 resolver?.(true);
 };

 const handleCancel = () => {
 setIsOpen(false);
 resolver?.(false);
 };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        {options && (
          <DialogContent
            showCloseButton={false}
            className="max-w-md p-6"
            onCloseAutoFocus={(e) => { e.preventDefault(); triggerRef.current?.focus?.(); }}
          >
            <DialogHeader className="flex flex-row items-start gap-4 text-left">
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                options.variant === 'destructive' ? "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400" : "bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
              )}>
                <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg font-bold text-foreground">{options.title}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {options.message}
                </DialogDescription>
              </div>
            </DialogHeader>

            <DialogFooter className="mt-8 flex justify-end gap-3 sm:flex-row flex-col-reverse">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-semibold border border-border bg-background text-foreground rounded-md hover:bg-accent transition-colors"
              >
                {options.cancelText || '취소'}
              </button>
              <button
                onClick={handleConfirm}
                className={cn(
                  "px-4 py-2 text-sm font-semibold text-white rounded-md shadow-sm transition-colors",
                  options.variant === 'destructive' ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
                )}
              >
                {options.confirmText || '확인'}
              </button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
 const context = useContext(ConfirmContext);
 if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
 return context.confirm;
};
