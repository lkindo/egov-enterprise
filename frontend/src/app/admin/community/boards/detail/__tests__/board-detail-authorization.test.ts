import { describe, expect, it } from 'vitest';
import { canManageBoardArticle } from '../BoardDetailClient';

describe('board detail mutation affordance', () => {
  it.each(['ADMIN', 'SYSTEM', 'ROLE_ADMIN', 'ROLE_SYSTEM'])(
    'permits the explicit administrator role %s',
    (role) => {
      expect(canManageBoardArticle({ id: 'admin-login', esntlId: 'ESNTL_admin', role }, 'ESNTL_owner')).toBe(true);
    },
  );

  it('permits only the article owner on the Board esntlId axis', () => {
    expect(canManageBoardArticle(
      { id: 'owner-login', esntlId: 'ESNTL_owner', role: 'USER' },
      'ESNTL_owner',
    )).toBe(true);
    expect(canManageBoardArticle(
      { id: 'other-login', esntlId: 'ESNTL_other', role: 'USER' },
      'ESNTL_owner',
    )).toBe(false);
  });

  it('does not confuse loginId with esntlId even when the legacy id happens to match the author', () => {
    expect(canManageBoardArticle(
      { id: 'ESNTL_owner', esntlId: 'ESNTL_other', role: 'USER' },
      'ESNTL_owner',
    )).toBe(false);
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
