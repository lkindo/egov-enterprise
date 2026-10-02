'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import type { AuthorizationGroupSummary } from '@/lib/auth/authorization-management-contract';
import { grantSets, menuPreviewMenusFromCatalog, previewMenuVisibility } from '@/lib/navigation/menu-visibility-preview';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { Button } from '@/components/ui/button';
import { MenuPreviewDialog } from './MenuPreviewDialog';

/**
 * 사용자 배정의 '메뉴 미리보기' — 그 사용자에게 고른 그룹 전부의 권한을 합쳐 사이드바를 본다(2026-10-02, 관리 콘솔 UX 2단계 A7).
 * 전체 그룹 권한(getGrantMatrix)을 한 번에 읽는다. 숨는 메뉴마다 고칠 그룹의 '화면별 권한' 줄로 가는 버튼을 둔다 — 허브 안
 * 상태 전환이며 URL·브라우저 저장소를 쓰지 않는다. 권한 설정 권한이 없으면 보기만 한다.
 */
export function UserMenuPreviewDialog({ userName, groupCodes, groups, onClose, onFixMenu }: {
  userName: string;
  /** 지금 고른(저장하지 않은 선택 포함) 그룹 코드. */
  groupCodes: readonly string[];
  groups: readonly AuthorizationGroupSummary[];
  onClose: () => void;
  onFixMenu?: (groupCode: string, menuCode: string) => void;
}) {
  const { user } = useAuth();
  const scope = ['authorization', user?.id, user?.authorizationVersion];
  const canRead = canPermission(user, 'AUTHRT_READ');
  const canGrant = canPermission(user, 'AUTHRT_GRANT');
  const catalog = useQuery({ queryKey: [...scope, 'catalog'], queryFn: () => authorizationAdminService.getCatalog(), enabled: canRead, retry: false });
  const matrix = useQuery({ queryKey: [...scope, 'grant-matrix'], queryFn: () => authorizationAdminService.getGrantMatrix(), enabled: canRead, retry: false });
  const title = `${userName} 메뉴 미리보기`;
  const nameOf = (code: string) => groups.find((group) => group.code === code)?.name ?? code;

  if (!catalog.data || !matrix.data) {
    const error = catalog.error ?? matrix.error;
    return (
      <StandardModal isOpen onClose={onClose} title={title} maxWidth="3xl">
        {error ? <p role="alert">{extractErrorMessage(error, '전체 그룹 권한을 불러오지 못했습니다. 다시 시도해 주세요.')}</p>
          : <p role="status">전체 그룹 권한을 불러오는 중입니다…</p>}
      </StandardModal>
    );
  }
  const included = matrix.data.groups.filter((group) => groupCodes.includes(group.code));
  const missing = groupCodes.filter((code) => !included.some((group) => group.code === code));
  const sets = grantSets(included.flatMap((group) => group.grants));
  const menus = menuPreviewMenusFromCatalog(catalog.data.navigation);
  const preview = previewMenuVisibility({ menus, navigation: sets.navigation, operations: sets.operations });
  return (
    <MenuPreviewDialog title={title} isOpen onClose={onClose} menus={menus} preview={preview} selectedNavigation={sets.navigation}
      basis={groupCodes.length === 0 ? '고른 그룹이 없습니다.' : `지금 고른 그룹 ${groupCodes.length}개(${groupCodes.map(nameOf).join(', ')})의 저장된 권한을 합친 결과입니다.`}
      notice={missing.length > 0 ? <p role="status" className="text-sm text-muted-foreground">권한을 읽지 못한 그룹이 있어 결과에서 뺐습니다: {missing.map(nameOf).join(', ')}.</p> : undefined}
      renderFix={canGrant && onFixMenu ? (menu) => groupCodes.map((code) => (
        // 이름은 보이는 글자로 시작하고 고칠 메뉴를 덧붙인다(WCAG 2.5.3 — 보이는 대로 불러도 맞는 버튼이 있게).
        <Button key={code} type="button" variant="outline" size="sm" aria-label={`${nameOf(code)}에서 고치기 (${menu.menuNm})`}
          onClick={() => onFixMenu(code, String(menu.menuNo))}>
          {nameOf(code)}에서 고치기
        </Button>
      )) : undefined} />
  );
}
