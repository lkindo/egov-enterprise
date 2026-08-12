import React from 'react';
import type { LucideIcon } from 'lucide-react';

/** Hub 컴포넌트가 허용하는 아이콘 계약: 이미 만든 요소 또는 Lucide 컴포넌트. */
export type HubIcon = React.ReactElement | LucideIcon;

/**
 * Lucide 아이콘은 React.forwardRef 결과라 런타임 typeof가 `object`다.
 * 함수 여부로 판별하지 않고 React가 지원하는 ElementType으로 직접 생성해야 아이콘이 사라지지 않는다.
 */
export function renderHubIcon(icon: HubIcon, size: number): React.ReactElement {
  return React.isValidElement(icon) ? icon : React.createElement(icon, { size });
}
