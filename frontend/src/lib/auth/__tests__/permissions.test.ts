import { describe, expect, it } from 'vitest';
import { canAnyPermission, canPermission, isPermissionCode } from '../permissions';

/*
 * 예시 권한은 core 코드(부서 업무)다 — 생성물은 권한 목록을 구성 코드로 줄이므로(Phase 2 10단계 10b) 선택하지 않은 기능의 코드는
 * 등록되지 않은 코드가 되어 canPermission 이 거짓이다. 이 판정 규칙 시험은 모든 구성에서 같은 뜻으로 돈다.
 */
describe('functional permission affordances', () => {
  it('uses explicit registered grants without elevating a legacy ADMIN role', () => {
    const legacy = { role: 'ROLE_ADMIN', permissions: [], authorizationVersion: 'v1' };
    expect(canPermission(legacy, 'DEPT_JOB_READ')).toBe(false);
    expect(canPermission({ permissions: ['DEPT_JOB_READ'], authorizationVersion: 'v1' }, 'DEPT_JOB_READ')).toBe(true);
    expect(canPermission({ permissions: ['DEPT_JOB_READ'], authorizationVersion: 'v2' }, 'DEPT_JOB_DELETE_ALL')).toBe(false);
  });

  it('does not promote owner modification permission to another owner’s override', () => {
    const owner = { permissions: ['DEPT_JOB_UPDATE'], authorizationVersion: 'v1' };
    expect(canPermission(owner, 'DEPT_JOB_UPDATE')).toBe(true);
    expect(canPermission(owner, 'DEPT_JOB_UPDATE_ALL')).toBe(false);
  });

  it('rejects unregistered grants, an unavailable version and missing identity', () => {
    expect(isPermissionCode('NOT_REGISTERED_TEST')).toBe(false);
    expect(canPermission({ permissions: ['NOT_REGISTERED_TEST'], authorizationVersion: 'v1' }, 'NOT_REGISTERED_TEST')).toBe(false);
    expect(canPermission({ permissions: ['DEPT_JOB_READ'], authorizationVersion: '' }, 'DEPT_JOB_READ')).toBe(false);
    expect(canPermission(null, 'DEPT_JOB_READ')).toBe(false);
    expect(canAnyPermission({ permissions: ['DEPT_JOB_READ'], authorizationVersion: 'v1' }, [])).toBe(false);
  });

  it('uses the replacement server snapshot after a grant is revoked', () => {
    expect(canPermission({ permissions: ['DEPT_JOB_READ'], authorizationVersion: 'before' }, 'DEPT_JOB_READ')).toBe(true);
    expect(canPermission({ permissions: [], authorizationVersion: 'after' }, 'DEPT_JOB_READ')).toBe(false);
  });
});
