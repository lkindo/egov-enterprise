import { describe, expect, it } from 'vitest';
import { canManageBoardArticle } from '../BoardDetailClient';

describe('board detail mutation affordance', () => {
  it.each(['ADMIN', 'SYSTEM', 'ROLE_ADMIN', 'ROLE_SYSTEM'])(
    'permits the explicit administrator role %s',
    (role) => {
      expect(canManageBoardArticle({ id: 'admin-login', esntlId: 'ESNTL_admin', role }, 'ESNTL_owner')).toBe(true);
    },
  );

  /*
    [2026-08-29] 대소문자 축. 이 화면은 종전에 자체 Set 으로 role 을 **원문 비교**했고,
    SSOT 와 proxy 의 라우트 게이트는 둘 다 대문자로 정규화한다. 서버 표기가 흔들리면
    라우트는 열어 주는데 화면에서만 수정·삭제 버튼이 사라지는 비대칭이 생긴다.

    ⚠ 표시 판정이지 인가가 아니다 — 서버가 assertOwnerOrAdminByEsntlId 로 따로 집행하므로
    여기서 넓혀도 서버 권한은 넓어지지 않는다.
  */
  it.each(['role_admin', 'Role_System', 'admin'])(
    'absorbs server casing drift for %s — the route gate already does',
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
