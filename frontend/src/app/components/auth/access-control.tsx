'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AccessControlProps {
 children: React.ReactNode;
 allowedRoles?: string[];
 fallback?: React.ReactNode;
}

/**
 * ?¬ìš©??ê¶Œí•œ???°ë¼ ?˜ìœ„ ?”ì†Œë¥??¨ê¸°ê±°ë‚˜ ë³´ì—¬ì£¼ëŠ” ì»´í¬?ŒíŠ¸
 */
export function AccessControl({
 children,
 allowedRoles = [],
 fallback = null
}: AccessControlProps) {
 const { user } = useAuth();

 // ë¡œê·¸?¸í•˜ì§€ ?Šì? ê²½ìš°
 if (!user) return fallback;

 // ?¹ì • ??• ???„ìš”??ê²½ìš° ì²´í¬ (?¬ìš©?ì˜ role ?„ë“œ?€ ?€ì¡?
 if (allowedRoles.length > 0) {
 const hasRole = allowedRoles.some(role => user.role === role);
 if (!hasRole) return fallback;
 }

 return <>{children}</>;
}
