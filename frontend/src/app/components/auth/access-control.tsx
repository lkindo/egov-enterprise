'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AccessControlProps {
 children: React.ReactNode;
 allowedRoles?: string[];
 fallback?: React.ReactNode;
}

/**
 * 사용자권한님?곕씪 하위 ?붿냼瑜님④린嫄곕굹 蹂댁뿬二쇰뒗 而댄룷?뚰듃
 */
export function AccessControl({
 children,
 allowedRoles = [],
 fallback = null
}: AccessControlProps) {
 const { user } = useAuth();

 // 로그?명븯吏 ?딆? 寃쎌슦
 if (!user) return fallback;

 // ?뱀젙 님븷님?꾩슂님寃쎌슦 泥댄겕 (사용자의 role ?꾨뱶 議
 if (allowedRoles.length > 0) {
 const hasRole = allowedRoles.some(role => user.role === role);
 if (!hasRole) return fallback;
 }

 return <>{children}</>;
}

