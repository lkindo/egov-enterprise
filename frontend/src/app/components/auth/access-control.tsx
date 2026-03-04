'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AccessControlProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
}

/**
 * 사용자 권한에 따라 하위 요소를 숨기거나 보여주는 컴포넌트
 */
export function AccessControl({
  children,
  allowedRoles = [],
  fallback = null
}: AccessControlProps) {
  const { user } = useAuth();

  // 로그인하지 않은 경우
  if (!user) return fallback;

  // 특정 역할이 필요한 경우 체크 (사용자의 role 필드와 대조)
  if (allowedRoles.length > 0) {
    const hasRole = allowedRoles.some(role => user.role === role);
    if (!hasRole) return fallback;
  }

  return <>{children}</>;
}