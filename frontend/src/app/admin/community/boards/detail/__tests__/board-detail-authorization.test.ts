import { describe, expect, it } from 'vitest';
import { canManageBoardArticle } from '../BoardDetailClient';

describe('board detail mutation affordance', () => {
  it.each(['ADMIN', 'SYSTEM', 'ROLE_ADMIN', 'ROLE_SYSTEM'])(
    'does not grant a management override from legacy role %s',
    (role) => {
      expect(canManageBoardArticle({ id: 'admin-login', esntlId: 'ESNTL_admin', role }, 'ESNTL_owner')).toBe(false);
    },
  );

  // Legacy role spelling never grants the source-defined operation permissions.
  it.each(['role_admin', 'Role_System', 'admin'])(
    'does not grant an override from case variant %s either',
    (role) => {
      expect(canManageBoardArticle({ id: 'admin-login', esntlId: 'ESNTL_admin', role }, 'ESNTL_owner')).toBe(false);
    },
  );

  it('permits only the article owner on the Board esntlId axis', () => {
    expect(canManageBoardArticle(
      { id: 'owner-login', esntlId: 'ESNTL_owner', permissions: ['BOARD_UPDATE'], authorizationVersion: 'v1' },
      'ESNTL_owner',
    )).toBe(true);
    expect(canManageBoardArticle(
      { id: 'other-login', esntlId: 'ESNTL_other', permissions: ['BOARD_UPDATE'], authorizationVersion: 'v1' },
      'ESNTL_owner',
    )).toBe(false);
  });

  it('does not confuse loginId with esntlId even when the legacy id happens to match the author', () => {
    expect(canManageBoardArticle(
      { id: 'ESNTL_owner', esntlId: 'ESNTL_other', permissions: ['BOARD_UPDATE'], authorizationVersion: 'v1' },
      'ESNTL_owner',
    )).toBe(false);
  });

  it('separates update and delete overrides and revokes them with the current snapshot', () => {
    const editor = { id: 'editor', permissions: ['BOARD_UPDATE', 'BOARD_UPDATE_ALL'], authorizationVersion: 'v1' };
    expect(canManageBoardArticle(editor, 'another-owner', 'UPDATE')).toBe(true);
    expect(canManageBoardArticle(editor, 'another-owner', 'DELETE')).toBe(false);
    expect(canManageBoardArticle({ ...editor, permissions: [], authorizationVersion: 'v2' }, 'another-owner', 'UPDATE')).toBe(false);
  });

  it.each(['UPDATE', 'DELETE'] as const)('requires the base %s operation even with its owner override', (action) => {
    expect(canManageBoardArticle({ id: 'editor', permissions: [`BOARD_${action}_ALL`], authorizationVersion: 'v1' }, 'another-owner', action)).toBe(false);
    expect(canManageBoardArticle({ id: 'owner', esntlId: 'owner', permissions: [], authorizationVersion: 'v1' }, 'owner', action)).toBe(false);
  });

  it('fails closed when esntlId, author, or role is ambiguous', () => {
    expect(canManageBoardArticle(null, 'ESNTL_owner')).toBe(false);
    expect(canManageBoardArticle(
      { id: 'owner-login', esntlId: 'ESNTL_owner', role: 'ADMINISTRATOR' },
      'ESNTL_other',
    )).toBe(false);
    expect(canManageBoardArticle({ id: 'owner-login', role: 'USER' }, 'ESNTL_owner')).toBe(false);
    expect(canManageBoardArticle(
      { id: 'owner-login', esntlId: 'ESNTL_owner', role: 'USER' },
      undefined,
    )).toBe(false);
  });
});
