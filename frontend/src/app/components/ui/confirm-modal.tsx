
import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface ConfirmOptions {
 title: string;
 message: string;
 confirmText?: string;
 cancelText?: string;
 variant?: 'default' | 'destructive';
 /**
  * [2026-10-05] 확인할 내용의 목록(예: 저장할 변경 항목). 설명 문장 아래 높이 제한 스크롤 상자에 보인다 — 길면 상자 안에서
  * 스크롤하고 키보드로도 스크롤할 수 있다(tabIndex 0, 이름 있는 영역). 설명(message)은 한 문장 요약으로 둔다.
  */
 details?: React.ReactNode;
 /** details 상자의 접근 이름(기본 '자세한 내용'). */
 detailsLabel?: string;
}

interface ConfirmContextType {
 confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
 const [isOpen, setIsOpen] = useState(false);
 const [options, setOptions] = useState<ConfirmOptions | null>(null);
 /*
 * [2026-09-26 DIP C8] 기다리는 확인은 하나뿐이다. 종전에는 resolver 를 state 로 두어, 확인이 열린 채 다른 확인을
 * 부르면 앞의 Promise 가 교체되어 영원히 끝나지 않았다 — 그 흐름의 잠금(ref)·버튼이 풀리지 않았다.
 * 새 확인이 열리면 앞의 확인은 취소(false)로 끝낸다.
 */
 const resolverRef = useRef<((value: boolean) => void) | null>(null);
 // 다이얼로그를 연 요소(invoker)를 기억했다가 닫힐 때 포커스를 되돌린다 (DialogTrigger 부재 보완)
 const triggerRef = useRef<HTMLElement | null>(null);
 /*
 * [2026-10-05] 처음 포커스는 언제나 '취소' 다. details 상자는 키보드로 스크롤하도록 탭 순서에 들지만(tabIndex 0) 처음
 * 포커스를 받지 않는다 — Radix 는 첫 탭 대상에 포커스를 두므로, 두지 않으면 details 를 넘긴 확인창만 처음 포커스가 상자로
 * 바뀐다(Enter 가 확정·취소 어느 것도 누르지 않는다). details 가 없을 때는 종전에도 '취소' 가 첫 탭 대상이었다.
 */
 const cancelRef = useRef<HTMLButtonElement | null>(null);

 const confirm = useCallback((opts: ConfirmOptions) => {
 const previous = resolverRef.current;
 resolverRef.current = null;
 if (previous) {
 previous(false);
 } else {
 // 중첩된 확인의 activeElement 는 앞 대화상자 안이다 — 처음 연 요소로 포커스를 되돌린다.
 triggerRef.current = (document.activeElement as HTMLElement) ?? null;
 }
 setOptions(opts);
 setIsOpen(true);
 return new Promise<boolean>((resolve) => {
 resolverRef.current = resolve;
 });
 }, []);
 const contextValue = useMemo(() => ({ confirm }), [confirm]);

 const settle = (value: boolean) => {
 setIsOpen(false);
 const resolve = resolverRef.current;
 resolverRef.current = null;
 resolve?.(value);
 };

 const handleConfirm = () => settle(true);

 const handleCancel = () => settle(false);

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        {options && (
          <DialogContent
            showCloseButton={false}
            className="max-w-md p-6"
            onOpenAutoFocus={(e) => {
              if (!cancelRef.current) return;
              e.preventDefault();
              cancelRef.current.focus();
            }}
            onCloseAutoFocus={(e) => { e.preventDefault(); triggerRef.current?.focus?.(); }}
          >
            <DialogHeader className="flex flex-row items-start gap-4 text-left">
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                options.variant === 'destructive' ? "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400" : "bg-hub-blue/10 text-hub-blue"
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

            {options.details && (
              <div
                role="region"
                aria-label={options.detailsLabel ?? '자세한 내용'}
                tabIndex={0}
                data-confirm-details=""
                className="relative mt-4 max-h-60 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {options.details}
              </div>
            )}

            <DialogFooter className="mt-8 flex justify-end gap-3 sm:flex-row flex-col-reverse">
              <button
                ref={cancelRef}
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
