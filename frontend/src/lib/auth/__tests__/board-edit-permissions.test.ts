import { describe, expect, it } from 'vitest';
import { canEditConfiguredBoard } from '../board-edit-permissions';

describe('configured board edit permissions', () => {
  const editor = { authorizationVersion: 'v1', permissions: ['NOTICE_EDIT', 'FAQ_EDIT'] };
  it('requires all configured permissions and closes unknown metadata', () => {
    expect(canEditConfiguredBoard(editor, { requiredEditPermissions: ['NOTICE_EDIT', 'FAQ_EDIT'] })).toBe(true);
    expect(canEditConfiguredBoard({ ...editor, permissions: ['NOTICE_EDIT'] }, { requiredEditPermissions: ['NOTICE_EDIT', 'FAQ_EDIT'] })).toBe(false);
    expect(canEditConfiguredBoard(editor, { requiredEditPermissions: ['UNREGISTERED'] })).toBe(false);
    expect(canEditConfiguredBoard(editor, null)).toBe(false);
    expect(canEditConfiguredBoard(editor, {})).toBe(false);
    expect(canEditConfiguredBoard({ permissions: [] }, { requiredEditPermissions: [] })).toBe(true);
  });
});
