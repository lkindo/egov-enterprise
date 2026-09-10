'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/** Server-provided menus belong to the identity/revision that first rendered this layout. */
export function useMenuAuthorizationScope() {
  const { user } = useAuth();
  const scope = [user?.id ?? null, user?.authorizationVersion ?? ''] as const;
  const [initialScope] = useState(scope);
  return {
    scope,
    authenticated: !!user,
    acceptsInitialMenus: initialScope[0] === scope[0] && initialScope[1] === scope[1],
  };
}
