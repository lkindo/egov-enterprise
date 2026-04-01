'취소';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

 const confirm = useCallback((opts: ConfirmOptions) => {
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
 {isOpen && options && (
 <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#020617]/90 animate-in fade-in duration-200">
 <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
 <div className="flex items-start gap-4">
 <div className={cn(
 "p-2 rounded-full",
 options.variant === 'destructive' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
 )}>
 <AlertCircle size={24} />
 </div>
 <div className="flex-1">
 <h3 className="text-lg font-bold text-foreground">{options.title}</h3>
 <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{options.message}</p>
 </div>
 </div>

 <div className="mt-8 flex justify-end gap-3">
 <button
 onClick={handleCancel}
 className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-accent transition-colors"
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
 </div>
 </div>
 </div>
 )}
 </ConfirmContext.Provider>
 );
}

export const useConfirm = () => {
 const context = useContext(ConfirmContext);
 if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
 return context.confirm;
};
