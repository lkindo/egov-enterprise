import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  permissions: ['BBS_MST_READ', 'BBS_MST_UPDATE', 'BBS_MST_DELETE'] as string[],
  updateBoardMaster: vi.fn(),
  isBoardMasterDeletable: vi.fn(),
  deleteBoardMasterPhysically: vi.fn(),
  invalidateQueries: vi.fn(),
  removeQueries: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  unsaved: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/contexts/UnsavedChangesContext', () => ({ useUnsavedChanges: mocks.unsaved }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@tanstack/react-query', () => ({
  queryOptions: <T,>(options: T) => options,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries, removeQueries: mocks.removeQueries }),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: {
    updateBoardMaster: mocks.updateBoardMaster,
    isBoardMasterDeletable: mocks.isBoardMasterDeletable,
    deleteBoardMasterPhysically: mocks.deleteBoardMasterPhysically,
  },
}));
vi.mock('../BoardChangeHistoryDialog', () => ({ BoardChangeHistoryDialog: () => <p>변경 이력 대화상자</p> }));

import { BoardSettingsTab } from '../BoardSettingsTab';

const DETAIL = {
  bbsId: 'BBSMSTR_AAAAAAAAAAAA', bbsTtl: '공지사항', bbsExpln: '전사 공지', bbsTypeCd: 'BBST02', bbsAtrbCd: 'BBSA01',
  tmpltId: 'TMPLT_LIST', ansPsbltyYn: 'N', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, atchPsbltyFileSz: 5_242_880,
  useYn: 'Y', ansYn: 'Y', stsfdgYn: 'Y', version: 4, designations: [] as ('NOTICE' | 'FAQ' | 'TASK')[],
};

function renderTab(detail: Partial<typeof DETAIL> = {}) {
  const onReload = vi.fn().mockResolvedValue(undefined);
  render(<BoardSettingsTab detail={{ ...DETAIL, ...detail } as never} onReload={onReload} />);
  return { onReload };
}

const changesStatus = () => screen.getByRole('status', { name: '' });

/** 운영 화면 설정 탭(ADR-0040 §5.5·결정 9·10). */
describe('BoardSettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['BBS_MST_READ', 'BBS_MST_UPDATE', 'BBS_MST_DELETE'];
    mocks.updateBoardMaster.mockResolvedValue(undefined);
    mocks.isBoardMasterDeletable.mockResolvedValue(true);
    mocks.deleteBoardMasterPhysically.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('바꾼 것이 없으면 변경 0건이고 확인할 수 없다', () => {
    renderTab();
    expect(changesStatus()).toHaveTextContent('변경 0건');
    expect(screen.getByRole('button', { name: '변경 내용 확인' })).toBeDisabled();
  });

  it('변경을 확인 표로 보이고, 읽은 버전과 함께 저장하며 템플릿·유형·귀속은 보내지 않는다', async () => {
    const { onReload } = renderTab();
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '전사 공지사항' } });
    fireEvent.click(screen.getByRole('switch', { name: /댓글 받기/ }));
    expect(changesStatus()).toHaveTextContent('변경 2건');
    expect(mocks.unsaved).toHaveBeenLastCalledWith({ dirty: true, pending: false });
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));

    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
    const rows = within(review).getAllByRole('row').slice(1).map((row) => row.textContent);
    expect(rows).toEqual([
      '게시판 명칭공지사항전사 공지사항—',
      '댓글 받기받음받지 않음새 댓글만 막습니다. 이미 달린 댓글은 그대로 보입니다.',
    ]);
    fireEvent.click(within(review).getByRole('button', { name: '설정 저장' }));

    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledOnce());
    const [bbsId, request] = mocks.updateBoardMaster.mock.calls[0];
    expect(bbsId).toBe('BBSMSTR_AAAAAAAAAAAA');
    expect(request).toMatchObject({ bbsTtl: '전사 공지사항', ansYn: 'N', stsfdgYn: 'Y', useYn: 'Y', version: 4, atchPsbltyFileSz: 5_242_880 });
    for (const immutable of ['tmpltId', 'bbsTypeCd', 'bbsAtrbCd', 'cmntySn']) expect(request).not.toHaveProperty(immutable);
    await waitFor(() => expect(onReload).toHaveBeenCalled());
    expect(mocks.toast).toHaveBeenCalledWith('게시판 설정을 저장했습니다.', 'success');
    expect(changesStatus()).toHaveTextContent('변경 0건');
    // 이름·사용 여부는 목록·이용 화면 메타·선택지·변경 이력·커뮤니티 게시판 목록에도 보인다 — 모두 다시 읽는다.
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['board-masters'] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['community-boards'] });
  });

  it('다른 사용자가 먼저 고쳤으면(409) 덮어쓰지 않았다고 알리고 최신 값을 다시 읽되 입력은 남긴다', async () => {
    mocks.updateBoardMaster.mockRejectedValue({ response: { status: 409, data: { message: '다른 사용자가 먼저 수정했습니다.' } } });
    const { onReload } = renderTab();
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '새 이름' } });
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '변경 내용 확인' })).getByRole('button', { name: '설정 저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('다른 사용자가 먼저 수정해 저장하지 않았습니다');
    expect(onReload).toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: '게시판 명칭' })).toHaveValue('새 이름');
    expect(changesStatus()).toHaveTextContent('변경 1건');
  });

  it('서버 상한을 넘는 첨부 파일 수는 확인으로 넘어가지 않고 필드에 알린다', async () => {
    renderTab();
    fireEvent.change(screen.getByRole('spinbutton', { name: /첨부 파일 수/ }), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
    expect(await screen.findByText('서버는 한 번에 20개까지 받습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '변경 내용 확인' })).toBeNull();
    expect(mocks.updateBoardMaster).not.toHaveBeenCalled();
  });

  it('지정 게시판을 사용 안 함으로 바꾸면 사용처를 확인 표 아래에 나열한다', async () => {
    renderTab({ designations: ['NOTICE'] });
    expect(screen.getByRole('heading', { name: '이 게시판의 고정 제약' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /게시판 사용/ }));
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
    expect(within(review).getByRole('note')).toHaveTextContent('공지 지정 게시판입니다');
    expect(within(review).getByText(/이용자에게 읽기·쓰기 모두 닫힙니다/)).toBeInTheDocument();
  });

  it('게시판 관리 수정 권한이 없으면 입력을 잠그고 저장 동작을 두지 않는다', () => {
    mocks.permissions = ['BBS_MST_READ'];
    renderTab();
    expect(screen.getByRole('textbox', { name: '게시판 명칭' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '변경 내용 확인' })).toBeNull();
    expect(screen.getByText(/설정을 바꿀 권한이 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '변경 이력' })).toBeInTheDocument();
  });

  it('화면 유형·커뮤니티 귀속은 읽기 전용이고, 비어 있는 파일당 크기는 전역 상한이다', () => {
    renderTab({ atchPsbltyFileSz: null as unknown as number });
    expect(screen.getByText('Enterprise List')).toBeInTheDocument();
    expect(screen.getByText('없음')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /파일당 크기/ })).toHaveValue(0);
    expect(changesStatus()).toHaveTextContent('변경 0건');
  });

  it('설정 저장은 같은 tick 의 두 번째 요청을 보내지 않고, 저장 중 잠그며, 실패하면 알리고 입력을 남긴다', async () => {
    let rejectSave!: (reason?: unknown) => void;
    mocks.updateBoardMaster.mockReturnValueOnce(new Promise((_, reject) => { rejectSave = reject; }));
    renderTab();
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '새 이름' } });
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
    const save = within(review).getByRole('button', { name: '설정 저장' });

    act(() => {
      fireEvent.click(save);
      fireEvent.click(save);
    });

    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledTimes(1));
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('aria-busy', 'true');
    expect(save).toHaveAccessibleName('저장 중…');
    rejectSave(new Error('설정 저장 서버 오류'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('설정 저장 서버 오류', 'error'));
    expect(screen.getByRole('textbox', { name: '게시판 명칭' })).toHaveValue('새 이름');
  });

  describe('영구 삭제', () => {
    it('같은 tick 의 두 번째 요청은 보내지 않고, 처리 중 잠그며, 실패하면 알린다', async () => {
      let rejectDelete!: (reason?: unknown) => void;
      mocks.deleteBoardMasterPhysically.mockReturnValueOnce(new Promise((_, reject) => { rejectDelete = reject; }));
      renderTab({ useYn: 'N' });
      const purge = screen.getByRole('button', { name: '게시판 영구 삭제' });

      act(() => {
        fireEvent.click(purge);
        fireEvent.click(purge);
      });

      await waitFor(() => expect(mocks.deleteBoardMasterPhysically).toHaveBeenCalledTimes(1));
      expect(mocks.isBoardMasterDeletable).toHaveBeenCalledTimes(1);
      expect(purge).toBeDisabled();
      expect(purge).toHaveAttribute('aria-busy', 'true');
      rejectDelete(new Error('영구 삭제 서버 오류'));
      await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('영구 삭제 서버 오류', 'error'));
      expect(purge).not.toBeDisabled();
      expect(mocks.push).not.toHaveBeenCalled();
    });

    it('사용 중인 게시판은 영구 삭제할 수 없다고 미리 말한다', () => {
      renderTab();
      expect(screen.getByRole('button', { name: '게시판 영구 삭제' })).toBeDisabled();
      expect(screen.getByText('먼저 게시판 사용을 사용 안 함으로 바꿔 저장하세요.')).toBeInTheDocument();
    });

    it('글이 있었던 게시판은 따를 수 있는 사실만 말하고 지우지 않는다', async () => {
      mocks.isBoardMasterDeletable.mockResolvedValue(false);
      renderTab({ useYn: 'N' });
      fireEvent.click(screen.getByRole('button', { name: '게시판 영구 삭제' }));
      await waitFor(() => expect(mocks.confirm).toHaveBeenCalledOnce());
      expect(mocks.confirm.mock.calls[0][0].message).toContain('글이 한 번이라도 있었던 게시판이라 영구 삭제할 수 없습니다');
      expect(mocks.deleteBoardMasterPhysically).not.toHaveBeenCalled();
    });

    it('확인하면 지우고 목록으로 돌아간다', async () => {
      renderTab({ useYn: 'N' });
      fireEvent.click(screen.getByRole('button', { name: '게시판 영구 삭제' }));
      await waitFor(() => expect(mocks.deleteBoardMasterPhysically).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA'));
      expect(mocks.push).toHaveBeenCalledWith('/admin/community/boards/master');
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['board-masters'] });
      // 지운 게시판의 상세는 무효화 전에 캐시에서 뺀다 — 열린 운영 화면이 다시 읽어 404 를 띄우지 않는다.
      expect(mocks.removeQueries).toHaveBeenCalledWith({ queryKey: ['board-masters', 'detail', 'BBSMSTR_AAAAAAAAAAAA'] });
      expect(mocks.removeQueries.mock.invocationCallOrder[0]).toBeLessThan(mocks.invalidateQueries.mock.invocationCallOrder[0]);
    });

    it('게시판 관리 삭제 권한이 없으면 영구 삭제 절차를 두지 않는다', () => {
      mocks.permissions = ['BBS_MST_READ', 'BBS_MST_UPDATE'];
      renderTab({ useYn: 'N' });
      expect(screen.queryByRole('button', { name: '게시판 영구 삭제' })).toBeNull();
    });
  });
});
