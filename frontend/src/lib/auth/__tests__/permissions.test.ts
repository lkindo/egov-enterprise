import { describe, expect, it } from 'vitest';
import { canAnyPermission, canPermission, isPermissionCode } from '../permissions';

describe('functional permission affordances', () => {
  it('uses explicit registered grants without elevating a legacy ADMIN role', () => {
    const legacy = { role: 'ROLE_ADMIN', permissions: [], authorizationVersion: 'v1' };
    expect(canPermission(legacy, 'BOARD_READ')).toBe(false);
    expect(canPermission({ permissions: ['BOARD_READ'], authorizationVersion: 'v1' }, 'BOARD_READ')).toBe(true);
    expect(canPermission({ permissions: ['BOARD_READ'], authorizationVersion: 'v2' }, 'BOARD_DELETE_ALL')).toBe(false);
  });

  it('does not promote owner modification permission to another owner’s override', () => {
    const owner = { permissions: ['BOARD_UPDATE'], authorizationVersion: 'v1' };
    expect(canPermission(owner, 'BOARD_UPDATE')).toBe(true);
    expect(canPermission(owner, 'BOARD_UPDATE_ALL')).toBe(false);
  });

  it('rejects unregistered grants, an unavailable version and missing identity', () => {
    expect(isPermissionCode('NOT_REGISTERED_TEST')).toBe(false);
    expect(canPermission({ permissions: ['NOT_REGISTERED_TEST'], authorizationVersion: 'v1' }, 'NOT_REGISTERED_TEST')).toBe(false);
    expect(canPermission({ permissions: ['BOARD_READ'], authorizationVersion: '' }, 'BOARD_READ')).toBe(false);
    expect(canPermission(null, 'BOARD_READ')).toBe(false);
    expect(canAnyPermission({ permissions: ['BOARD_READ'], authorizationVersion: 'v1' }, [])).toBe(false);
  });

  it('uses the replacement server snapshot after a grant is revoked', () => {
    expect(canPermission({ permissions: ['BOARD_READ'], authorizationVersion: 'before' }, 'BOARD_READ')).toBe(true);
    expect(canPermission({ permissions: [], authorizationVersion: 'after' }, 'BOARD_READ')).toBe(false);
  });
});
