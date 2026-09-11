'use client';

import { useId, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { NavigationPermissionNode, NavigationPermissionTree as NavigationTree } from '@/lib/auth/navigation-permission-tree';

interface SelectionProps {
  selection: ReadonlySet<string>;
  disabled: boolean;
  onToggle: (code: string, checked: boolean) => void;
}

function NavigationNode({ node, selection, disabled, onToggle }: SelectionProps & { node: NavigationPermissionNode }) {
  const [expanded, setExpanded] = useState(true);
  const childrenId = useId();
  const hasChildren = node.children.length > 0;
  return (
    <li className="space-y-1">
      <div className="flex items-center gap-1">
        {hasChildren ? <Button type="button" variant="ghost" size="icon-sm"
          aria-label={`${node.name} 하위 메뉴 ${expanded ? '접기' : '펼치기'}`}
          aria-expanded={expanded} aria-controls={childrenId} onClick={() => setExpanded((value) => !value)}>
          {expanded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        </Button> : <span aria-hidden="true" className="w-[var(--control-h-sm)] shrink-0" />}
        <label className="flex min-w-0 flex-1 items-center gap-3 py-2 text-sm">
          <Checkbox checked={selection.has(`NAVIGATION:${node.code}`)} disabled={disabled}
            onCheckedChange={(checked) => onToggle(node.code, checked === true)} />
          <span className="min-w-0 break-words">{node.name}<span className="ml-2 text-xs text-muted-foreground">{node.code}</span></span>
        </label>
      </div>
      {hasChildren && <ul id={childrenId} aria-label={`${node.name} 하위 메뉴`} hidden={!expanded} className="ml-4 space-y-1 border-l border-border pl-3">
        {node.children.map((child) => <NavigationNode key={child.code} node={child} selection={selection} disabled={disabled} onToggle={onToggle} />)}
      </ul>}
    </li>
  );
}

/** Native lists, disclosure buttons and checkboxes preserve keyboard and hierarchy semantics. */
export function NavigationPermissionTree({ tree, ...selectionProps }: SelectionProps & { tree: NavigationTree }) {
  if (tree.error) return null;
  if (tree.roots.length === 0) return <p role="status" className="text-sm text-muted-foreground">등록된 메뉴가 없습니다.</p>;
  return <ul aria-label="메뉴 표시 권한" className="max-h-96 space-y-1 overflow-auto rounded-md border border-border p-3">
    {tree.roots.map((node) => <NavigationNode key={node.code} node={node} {...selectionProps} />)}
  </ul>;
}
