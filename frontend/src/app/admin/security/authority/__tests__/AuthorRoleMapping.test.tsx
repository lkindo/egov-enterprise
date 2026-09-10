import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), 'src', path), 'utf8');
describe('technical role assignment retirement', () => {
  it('허브는 기술 롤 패턴·단일 권한 변경 API 없이 기능권한과 복수 그룹 관리 화면을 연결한다', () => {
    const hub = source('app/admin/security/authority/SecurityHubClient.tsx');
    expect(hub).toContain('AuthorizationGroupEditor');
    expect(hub).toContain('AuthorizationMembershipEditor');
    expect(hub).toContain('authorizationAdminService.getCatalog');
    for (const retired of ['rolePatrn', 'getAuthorRoles', 'saveAuthorRoles', 'saveUserAuthorities', 'tempRoleMappings']) expect(hub).not.toContain(retired);
  });
  it('사용자 관리에 ADMIN 라디오 선택이나 단일 role 전체 교체 요청이 남지 않는다', () => {
    const userHub = source('app/admin/user/UserOrgHubClient.tsx');
    expect(userHub).not.toContain('bulkUpdateUserRoleAction');
    expect(userHub).not.toContain('bulk-role-label');
    expect(source('app/actions/userActions.ts')).not.toContain('bulkUpdateUserRoleAction');
  });
});
