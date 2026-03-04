'use client';

import React, { createContext, useContext, useEffect, useCallback } from 'react';

type ShortcutCallback = (e: KeyboardEvent) => void;

interface ShortcutContextType {
  registerShortcut: (key: string, ctrl: boolean, callback: ShortcutCallback) => () => void;
}

const ShortcutContext = createContext<ShortcutContextType | undefined>(undefined);

export function GlobalShortcutProvider({ children }: { children: React.ReactNode }) {
  const shortcuts = React.useRef<Map<string, ShortcutCallback>>(new Map());

  const registerShortcut = useCallback((key: string, ctrl: boolean, callback: ShortcutCallback) => {
    const fullKey = `${ctrl ? 'ctrl+' : ''}${key.toLowerCase()}`;
    shortcuts.current.set(fullKey, callback);

    return () => {
      shortcuts.current.delete(fullKey);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return;
      const pressedKey = e.key.toLowerCase();
      const isCtrl = e.ctrlKey || e.metaKey;
      const fullKey = `${isCtrl ? 'ctrl+' : ''}${pressedKey}`;

      if (shortcuts.current.has(fullKey)) {
        e.preventDefault();
        shortcuts.current.get(fullKey)?.(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ShortcutContext.Provider value={{ registerShortcut }}>
      {children}
    </ShortcutContext.Provider>
  );
}

export const useShortcut = (key: string, ctrl: boolean, callback: ShortcutCallback) => {
  const context = useContext(ShortcutContext);
  if (!context) throw new Error('useShortcut must be used within GlobalShortcutProvider');

  useEffect(() => {
    const unregister = context.registerShortcut(key, ctrl, callback);
    return unregister;
  }, [context, key, ctrl, callback]);
};
