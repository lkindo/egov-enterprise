import { describe, expect, it } from 'vitest';
import { canEditConfiguredBoard } from '../board-edit-permissions';

/*
 * 예시 권한은 모든 구성에 있는 core 코드다 — 생성물은 권한 목록을 구성 코드로 줄이므로(Phase 2 10단계 10b) 선택하지 않은
 * 기능의 코드는 등록되지 않은 코드가 되어 canPermission 이 거짓이다. 이 판정 함수는 core(lib/auth)에 남으므로
 * 게시판이 빠진 구성에서도 같은 뜻으로 돈다(게시판의 공지·FAQ 편집 권한 대신 메뉴·코드 수정 권한으로 시험한다).
 */
describe('configured board edit permissions', () => {
  const editor = { authorizationVersion: 'v1', permissions: ['MENU_UPDATE', 'CODE_UPDATE'] };
  it('requires all configured permissions and closes unknown metadata', () => {
    expect(canEditConfiguredBoard(editor, { requiredEditPermissions: ['MENU_UPDATE', 'CODE_UPDATE'] })).toBe(true);
    expect(canEditConfiguredBoard({ ...editor, permissions: ['MENU_UPDATE'] }, { requiredEditPermissions: ['MENU_UPDATE', 'CODE_UPDATE'] })).toBe(false);
    expect(canEditConfiguredBoard(editor, { requiredEditPermissions: ['UNREGISTERED'] })).toBe(false);
    expect(canEditConfiguredBoard(editor, null)).toBe(false);
    expect(canEditConfiguredBoard(editor, {})).toBe(false);
    expect(canEditConfiguredBoard({ permissions: [] }, { requiredEditPermissions: [] })).toBe(true);
  });
});
