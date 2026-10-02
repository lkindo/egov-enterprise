'use client';

import type { ReactNode } from 'react';
import { StandardModal } from '@/app/components/ui/standard-modal';
import {
  MENU_HIDDEN_REASON_LABELS,
  menuPreviewKey,
  type MenuPreviewMenu,
  type MenuPreviewNode,
  type MenuVisibilityPreview,
} from '@/lib/navigation/menu-visibility-preview';

function PreviewTree({ nodes, label }: { nodes: readonly MenuPreviewNode[]; label?: string }) {
  return (
    <ul aria-label={label} className="space-y-1 border-l border-border pl-3 first:border-l-0 first:pl-0">
      {nodes.map((node) => (
        <li key={String(node.menuNo)}>
          <span className="text-sm">{node.menuNm}</span>
          {node.route && <span className="ml-2 text-xs text-muted-foreground">{node.route}</span>}
          {node.children.length > 0 && <PreviewTree nodes={node.children} label={`${node.menuNm} 하위 메뉴`} />}
        </li>
      ))}
    </ul>
  );
}

/**
 * '메뉴 미리보기' — 이 권한이면 사이드바에 무엇이 보이고, 메뉴 표시를 줬는데도 숨는 메뉴는 왜 숨는가(2026-10-02, 관리 콘솔 UX
 * 2단계 A7). 읽기 전용이다. 판정은 사이드바와 같은 함수(menu-visibility-preview)이고, 노출 판정일 뿐 인가가 아니다(H3).
 *
 * 숨는 메뉴는 메뉴 표시가 있는 것만 나열한다 — 표시를 주지 않은 메뉴가 숨는 것은 정상이라 목록을 덮지 않게 수만 말한다.
 * 줄마다 고치러 가는 버튼은 호출하는 쪽이 정한다(그룹 편집기는 그 줄로, 사용자 배정은 고칠 그룹의 줄로).
 */
export function MenuPreviewDialog({ title, isOpen, onClose, basis, menus, preview, selectedNavigation, renderFix, notice }: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  /** 무엇을 기준으로 본 결과인가(초안 포함 여부, 합친 그룹 등). */
  basis: string;
  menus: readonly MenuPreviewMenu[];
  preview: MenuVisibilityPreview;
  /** 메뉴 표시를 준 메뉴 키. */
  selectedNavigation: ReadonlySet<string>;
  renderFix?: (menu: MenuPreviewMenu) => ReactNode;
  notice?: ReactNode;
}) {
  const hidden = menus.filter((menu) => {
    const visibility = preview.byMenu.get(menuPreviewKey(menu.menuNo));
    return visibility && !visibility.visible && selectedNavigation.has(menuPreviewKey(menu.menuNo));
  });
  const unselectedHidden = menus.filter((menu) => {
    const visibility = preview.byMenu.get(menuPreviewKey(menu.menuNo));
    return visibility && !visibility.visible && !selectedNavigation.has(menuPreviewKey(menu.menuNo));
  }).length;
  return (
    <StandardModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="3xl">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{basis} 사이드바와 같은 규칙으로 판정합니다. 노출 판정일 뿐이며 실제 조회·변경은 서버가 기능권한으로 판정합니다.</p>
        {notice}
        <section aria-label="사이드바에 보이는 메뉴" className="space-y-2">
          <h3 className="text-sm font-semibold">사이드바에 보이는 메뉴</h3>
          {preview.tree.length === 0 ? <p role="status" className="text-sm text-muted-foreground">보이는 메뉴가 없습니다.</p>
            : <PreviewTree nodes={preview.tree} label="보이는 메뉴 트리" />}
        </section>
        <section aria-label="메뉴 표시를 줬지만 숨는 메뉴" className="space-y-2">
          <h3 className="text-sm font-semibold">메뉴 표시를 줬지만 숨는 메뉴 {hidden.length}개</h3>
          {hidden.length === 0 ? <p role="status" className="text-sm text-muted-foreground">메뉴 표시를 준 메뉴는 모두 보입니다.</p> : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {hidden.map((menu) => {
                const visibility = preview.byMenu.get(menuPreviewKey(menu.menuNo))!;
                return (
                  <li key={String(menu.menuNo)} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <span className="min-w-0">
                      <span className="text-sm font-medium">{menu.menuNm}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{visibility.visible ? '' : MENU_HIDDEN_REASON_LABELS[visibility.reason]}</span>
                    </span>
                    {renderFix && <span className="flex flex-wrap gap-2">{renderFix(menu)}</span>}
                  </li>
                );
              })}
            </ul>
          )}
          {unselectedHidden > 0 && <p className="text-xs text-muted-foreground">메뉴 표시를 주지 않아 숨는 메뉴 {unselectedHidden}개는 목록에서 뺐습니다.</p>}
        </section>
      </div>
    </StandardModal>
  );
}
