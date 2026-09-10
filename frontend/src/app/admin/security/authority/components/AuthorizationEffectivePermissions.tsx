'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { grantKey, hasCompleteCatalog, type AuthorizationMembership } from '@/lib/auth/authorization-management-contract';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { Button } from '@/components/ui/button';

export function AuthorizationEffectivePermissions({ snapshot, current }: { snapshot: AuthorizationMembership; current: boolean }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const query = useQuery({
    queryKey: ['authorization', user?.id, user?.authorizationVersion, 'effective-groups', snapshot.userId, snapshot.version],
    enabled: expanded && current && snapshot.complete && canPermission(user, 'AUTHRT_READ'), retry: false,
    queryFn: async () => {
      const [catalog, before] = await Promise.all([authorizationAdminService.getCatalog(), authorizationAdminService.getMemberships(snapshot.userId)]);
      if (before.version !== snapshot.version) throw new Error('배정 정보가 변경되었습니다.');
      const details = await Promise.all(before.groups.map((code) => authorizationAdminService.getGroup(code)));
      const [after, groups, catalogAfter] = await Promise.all([authorizationAdminService.getMemberships(snapshot.userId), authorizationAdminService.getGroups(), authorizationAdminService.getCatalog()]);
      if (after.version !== before.version || catalogAfter.catalogVersion !== catalog.catalogVersion
        || details.some((group) => !hasCompleteCatalog(group, catalog) || groups.find((candidate) => candidate.code === group.code)?.version !== group.version)) {
        throw new Error('권한 정보가 변경되어 전체 결과를 확인하지 못했습니다.');
      }
      return catalog.operations.flatMap((operation) => {
        const providers = details.filter((group) => group.grants.some((grant) => grantKey(grant) === `OPERATION:${operation.code}`));
        return providers.length ? [{ code: operation.code, name: operation.name, providers: providers.map((group) => group.name) }] : [];
      });
    },
  });
  return <section aria-label="저장된 유효권한의 제공 그룹" className="space-y-3 rounded-md border border-border p-4">
    <Button type="button" variant="outline" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>저장된 유효권한 · 제공 그룹 {expanded ? '접기' : '보기'}</Button>
    {expanded && <>
      <p className="text-sm text-muted-foreground">저장된 배정을 합산한 조회 결과입니다. 아직 저장하지 않은 선택은 반영되지 않으며 본인 자료·공개 범위 등 서버의 자료별 조건은 계속 적용됩니다.</p>
      {!current || query.isError ? <p role="alert">최신 전체 권한을 확인하지 못했습니다. 배정 정보를 새로 조회해 주세요.</p>
        : query.isFetching ? <p role="status">제공 그룹을 확인하는 중입니다…</p>
          : query.data && <div className="max-h-80 overflow-auto"><table className="w-full text-left text-sm"><caption className="sr-only">기능권한별 제공 그룹</caption><thead><tr><th className="p-2">기능권한</th><th className="p-2">제공 그룹</th></tr></thead><tbody>{query.data.map((operation) => <tr key={operation.code} className="border-t border-border"><td className="p-2">{operation.name}<span className="block text-xs text-muted-foreground">{operation.code}</span></td><td className="p-2">{operation.providers.join(', ')}</td></tr>)}</tbody></table>{query.data.length === 0 && <p role="status">저장된 기능권한이 없습니다.</p>}</div>}
    </>}
  </section>;
}
