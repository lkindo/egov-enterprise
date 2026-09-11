'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';

type EditState = { dirty: boolean; pending?: boolean };
type Guard = () => EditState;
// The callback receives the original router for actions (such as logout) that must
// finish before leaving. Calling the protected router again would confirm twice.
type Navigate = (action: (router: React.ContextType<typeof AppRouterContext>) => void) => Promise<boolean>;
const Context = createContext<{ register: (guard: Guard) => () => void; navigate: Navigate } | null>(null);
const HISTORY_POINT = '__egov_edit_navigation';

/**
 * Check App Router transitions before they commit. Keep this adapter at the root.
 * History points contain no form data and preserve Next-owned history fields.
 * Reload/close/cross-document traversal use native beforeunload confirmation.
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const router = useContext(AppRouterContext);
  const confirm = useConfirm();
  const { toast } = useToast();
  const guards = useRef(new Set<Guard>());
  const confirming = useRef(false);
  const register = useCallback((guard: Guard) => {
    guards.current.add(guard);
    return () => { guards.current.delete(guard); };
  }, []);
  const hasChanges = useCallback(() => [...guards.current].some((get) => { const state = get(); return state.dirty || state.pending; }), []);
  const navigate = useCallback<Navigate>(async (action) => {
    if (confirming.current) return false;
    const states = [...guards.current].map((get) => get());
    if (states.some((state) => state.pending)) {
      toast('저장 중입니다. 처리 결과를 확인한 뒤 이동해 주세요.', 'info');
      return false;
    }
    if (!states.some((state) => state.dirty)) { action(router); return true; }
    confirming.current = true;
    try {
      const approved = await confirm({
        title: '저장하지 않은 변경',
        message: '이동하면 저장하지 않은 변경이 사라집니다. 저장하려면 계속 편집을 선택하세요.',
        confirmText: '변경 버리고 이동', cancelText: '계속 편집', variant: 'destructive',
      });
      if (!approved || [...guards.current].some((get) => get().pending)) return false;
      action(router);
      return true;
    } finally { confirming.current = false; }
  }, [confirm, toast, router]);
  const protectedRouter = useMemo(() => router && ({
    ...router,
    push: (...args: Parameters<typeof router.push>) => { void navigate(() => router.push(...args)); },
    replace: (...args: Parameters<typeof router.replace>) => { void navigate(() => router.replace(...args)); },
  }), [router, navigate]);

  useEffect(() => {
    let point = Number.isSafeInteger(history.state?.[HISTORY_POINT]) ? history.state[HISTORY_POINT] as number : 0;
    const push = history.pushState;
    const replace = history.replaceState;
    replace.call(history, { ...history.state, [HISTORY_POINT]: point }, '');
    const trackedPush: History['pushState'] = function (this: History, data, unused, url) {
      push.call(this, { ...data, [HISTORY_POINT]: point + 1 }, unused, url);
      point += 1;
    };
    const trackedReplace: History['replaceState'] = function (this: History, data, unused, url) {
      replace.call(this, { ...data, [HISTORY_POINT]: point }, unused, url);
    };
    history.pushState = trackedPush;
    history.replaceState = trackedReplace;
    let restoring: { target: number; delta: number } | null = null;
    let approvedPoint: number | null = null;
    const pop = (event: PopStateEvent) => {
      const target = event.state?.[HISTORY_POINT];
      if (!Number.isSafeInteger(target)) return;
      if (restoring) {
        event.stopImmediatePropagation();
        if (target !== point) { history.go(point - target); return; }
        const resume = restoring;
        restoring = null;
        void navigate(() => { approvedPoint = resume.target; history.go(-resume.delta); });
        return;
      }
      if (approvedPoint === target) { approvedPoint = null; point = target; return; }
      if (target === point || !hasChanges()) { point = target; return; }
      event.stopImmediatePropagation();
      restoring = { target, delta: point - target };
      history.go(restoring.delta);
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (hasChanges()) { event.preventDefault(); event.returnValue = ''; }
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const destination = new URL(link.href, location.href);
      if (destination.origin !== location.origin) return;
      if (!router) return;
      if (destination.pathname === location.pathname && destination.search === location.search) {
        // Next performs hash scrolling and writes a tracked history entry. A native
        // hash entry would not have a point, making a later multi-step Back ambiguous.
        if (destination.hash !== location.hash) {
          event.preventDefault(); event.stopImmediatePropagation();
          router.push(destination.pathname + destination.search + destination.hash);
        }
        return;
      }
      if (!hasChanges()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void navigate(() => router.push(destination.pathname + destination.search + destination.hash));
    };
    window.addEventListener('popstate', pop, true);
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('popstate', pop, true);
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', click, true);
      if (history.pushState === trackedPush) history.pushState = push;
      if (history.replaceState === trackedReplace) history.replaceState = replace;
    };
  }, [hasChanges, navigate, router]);

  const value = useMemo(() => ({ register, navigate }), [register, navigate]);
  return <Context.Provider value={value}>{protectedRouter
    ? <AppRouterContext.Provider value={protectedRouter}>{children}</AppRouterContext.Provider>
    : children}</Context.Provider>;
}

export function useUnsavedChanges(state: EditState | Guard): Navigate {
  const context = useContext(Context);
  const register = context?.register;
  const current = useRef(state);
  useLayoutEffect(() => { current.current = state; }, [state]);
  const read = useCallback(() => typeof current.current === 'function' ? current.current() : current.current, []);
  useEffect(() => register?.(read), [register, read]);
  return context?.navigate ?? (async (action) => { const value = read(); if (value.dirty || value.pending) return false; action(null); return true; });
}
