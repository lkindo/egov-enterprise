import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  getDeptScheduleList: vi.fn(),
  createDeptSchedule: vi.fn(),
  updateDeptSchedule: vi.fn(),
  deleteDeptSchedule: vi.fn(),
  confirm: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/services/business/schedule/deptScheduleService', () => ({
  getDeptScheduleList: harness.getDeptScheduleList,
  createDeptSchedule: harness.createDeptSchedule,
  updateDeptSchedule: harness.updateDeptSchedule,
  deleteDeptSchedule: harness.deleteDeptSchedule,
}));

vi.mock('sonner', () => ({
  toast: { error: harness.toastError, success: vi.fn() },
}));

import ScheduleDeptClient from '../ScheduleDeptClient';

describe('ScheduleDeptClient 조회 실패 정직성', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.getDeptScheduleList.mockResolvedValue({ list: [] });
    harness.createDeptSchedule.mockResolvedValue(undefined);
    harness.confirm.mockReturnValue(true);
    vi.stubGlobal('confirm', harness.confirm);
    harness.deleteDeptSchedule.mockResolvedValue(undefined);
    harness.updateDeptSchedule.mockResolvedValue(undefined);
  });

  it('조회 실패를 "등록된 일정 없음"으로 위장하지 않고 사유와 재시도 수단을 노출한다', async () => {
    harness.getDeptScheduleList.mockRejectedValueOnce(new Error('서버 연결에 실패했습니다.'));

    render(<ScheduleDeptClient />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('부서 일정 목록을 불러오지 못했습니다.');
    expect(alert).toHaveTextContent('서버 연결에 실패했습니다.');
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    // 실패가 빈 목록 문구로 표시되면 이 계약의 존재 이유가 사라진다.
    expect(screen.queryByText('등록된 부서 일정이 존재하지 않습니다.')).not.toBeInTheDocument();
  });

  it('재시도 버튼이 실제로 재조회해 성공 데이터를 렌더한다', async () => {
    harness.getDeptScheduleList
      .mockRejectedValueOnce(new Error('일시 오류'))
      .mockResolvedValueOnce({
        list: [
          {
            schdlSn: 1,
            schdlNm: '주간 부서 회의',
            schdlBgngYmd: '20260825',
            schdlEndYmd: '20260825',
            schdlPlcNm: '회의실 A',
          },
        ],
      });

    render(<ScheduleDeptClient />);
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('주간 부서 회의')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(harness.getDeptScheduleList).toHaveBeenCalledTimes(2);
  });

  it('성공했지만 0건이면 기존 빈 목록 문구를 유지한다', async () => {
    harness.getDeptScheduleList.mockResolvedValueOnce({ list: [] });

    render(<ScheduleDeptClient />);

    expect(await screen.findByText('등록된 부서 일정이 존재하지 않습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('조회 중에는 로딩 상태를 알리고 빈 목록 문구를 미리 보이지 않는다', async () => {
    let resolveList: (value: { list: never[] }) => void = () => {};
    harness.getDeptScheduleList.mockImplementationOnce(
      () => new Promise((resolve) => { resolveList = resolve; }),
    );

    render(<ScheduleDeptClient />);

    expect(screen.getByText('부서 일정을 불러오는 중')).toBeInTheDocument();
    expect(screen.queryByText('등록된 부서 일정이 존재하지 않습니다.')).not.toBeInTheDocument();

    resolveList({ list: [] });
    await waitFor(() =>
      expect(screen.queryByText('부서 일정을 불러오는 중')).not.toBeInTheDocument(),
    );
  });

  it('필수 일정명이 없으면 create 없이 첫 입력으로 이동하고 오류를 연결한다', async () => {
    render(<ScheduleDeptClient />);
    await screen.findByText('등록된 부서 일정이 존재하지 않습니다.');
    await userEvent.click(screen.getByRole('button', { name: /일정 등록/ }));

    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    const title = screen.getByRole('textbox', { name: /일정명/ });
    expect(harness.createDeptSchedule).not.toHaveBeenCalled();
    expect(await screen.findByText('일정명을 입력해 주세요.')).toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAttribute('aria-errormessage', 'schdlNm-error');
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('일정명·내용·장소 길이와 시작일 범위를 검증해 잘못된 update를 차단한다', async () => {
    harness.getDeptScheduleList.mockResolvedValue({
      list: [{
        schdlSn: 7,
        schdlNm: '기존 일정',
        schdlCn: '',
        schdlBgngYmd: '20260825',
        schdlEndYmd: '20260826',
        schdlPlcNm: '',
        schdlDeptId: 'D1',
        schdlSeCd: '1',
      }],
    });
    render(<ScheduleDeptClient />);
    await screen.findByText('기존 일정');
    await userEvent.click(screen.getByRole('button', { name: '기존 일정 수정' }));
    const title = screen.getByRole('textbox', { name: /일정명/ });
    fireEvent.change(title, { target: { value: '일'.repeat(101) } });
    fireEvent.change(screen.getByRole('textbox', { name: /내용/ }), { target: { value: '내'.repeat(4001) } });
    fireEvent.change(screen.getByRole('textbox', { name: /장소/ }), { target: { value: '장'.repeat(101) } });
    fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: '2026-08-28' } });
    fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: '2026-08-27' } });

    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(harness.updateDeptSchedule).not.toHaveBeenCalled();
    expect(await screen.findByText('일정명: 최대 100자까지 입력할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByText('내용: 최대 4000자까지 입력할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByText('장소: 최대 100자까지 입력할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByText('시작일은 종료일보다 빠르거나 같아야 합니다.')).toBeInTheDocument();
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('서버 필드 오류를 입력란으로 되돌리고 값과 dialog를 유지한다', async () => {
    harness.createDeptSchedule.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'schdlNm', message: '이미 등록된 일정명입니다.' }] } },
    });
    render(<ScheduleDeptClient />);
    await screen.findByText('등록된 부서 일정이 존재하지 않습니다.');
    await userEvent.click(screen.getByRole('button', { name: /일정 등록/ }));
    const title = screen.getByRole('textbox', { name: /일정명/ });
    fireEvent.change(title, { target: { value: '보존할 일정' } });

    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('이미 등록된 일정명입니다.')).toBeInTheDocument();
    expect(title).toHaveValue('보존할 일정');
    await waitFor(() => expect(title).toHaveFocus());
    expect(harness.toastError).not.toHaveBeenCalledWith('저장 중 오류가 발생했습니다.');
  });

  it('저장 중 연속 클릭을 동기적으로 차단한다', async () => {
    let finishCreate: (() => void) | undefined;
    harness.createDeptSchedule.mockImplementationOnce(
      () => new Promise<void>((resolve) => { finishCreate = resolve; }),
    );
    render(<ScheduleDeptClient />);
    await screen.findByText('등록된 부서 일정이 존재하지 않습니다.');
    await userEvent.click(screen.getByRole('button', { name: /일정 등록/ }));
    fireEvent.change(screen.getByRole('textbox', { name: /일정명/ }), {
      target: { value: '정상 일정' },
    });
    const save = screen.getByRole('button', { name: '저장' });

    fireEvent.click(save);
    fireEvent.click(save);

    expect(harness.createDeptSchedule).toHaveBeenCalledTimes(1);
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('aria-busy', 'true');
    expect(save).toHaveAccessibleName('저장 중…');
    finishCreate?.();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('삭제 중 같은 tick의 재요청을 막고 실패 후 일정 행을 보존한다', async () => {
    harness.getDeptScheduleList.mockResolvedValue({
      list: [{
        schdlSn: 7,
        schdlNm: '보존할 일정',
        schdlCn: '본문',
        schdlBgngYmd: '20260826',
        schdlEndYmd: '20260826',
        schdlPlcNm: '회의실',
        schdlDeptId: 'D1',
        schdlSeCd: '1',
      }],
    });
    let rejectDelete!: (reason?: unknown) => void;
    const pendingDelete = new Promise<void>((_, reject) => {
      rejectDelete = reject;
    });
    harness.deleteDeptSchedule.mockReturnValue(pendingDelete);
    render(<ScheduleDeptClient />);
    const remove = await screen.findByRole('button', { name: '보존할 일정 삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    expect(harness.confirm).toHaveBeenCalledTimes(1);
    expect(harness.deleteDeptSchedule).toHaveBeenCalledTimes(1);
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('보존할 일정 삭제 중');

    rejectDelete(new Error('삭제 서버 오류'));

    await waitFor(() => expect(harness.toastError).toHaveBeenCalledWith('삭제 중 오류가 발생했습니다.'));
    expect(screen.getByText('보존할 일정')).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
  });

  it('삭제가 끝나기 전에는 일정 등록·수정으로 같은 레코드 흐름을 바꾸지 않는다', async () => {
    harness.getDeptScheduleList.mockResolvedValue({
      list: [{
        schdlSn: 7,
        schdlNm: '경합 일정',
        schdlCn: '본문',
        schdlBgngYmd: '20260826',
        schdlEndYmd: '20260826',
        schdlPlcNm: '회의실',
        schdlDeptId: 'D1',
        schdlSeCd: '1',
      }],
    });
    let rejectDelete!: (reason?: unknown) => void;
    harness.deleteDeptSchedule.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDelete = reject;
    }));
    render(<ScheduleDeptClient />);
    const remove = await screen.findByRole('button', { name: '경합 일정 삭제' });

    fireEvent.click(remove);
    await waitFor(() => expect(harness.deleteDeptSchedule).toHaveBeenCalledTimes(1));

    const create = screen.getByRole('button', { name: /일정 등록/ });
    const edit = screen.getByRole('button', { name: '경합 일정 수정' });
    expect(create).toBeDisabled();
    expect(edit).toBeDisabled();
    fireEvent.click(create);
    fireEvent.click(edit);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => rejectDelete(new Error('삭제 실패')));
    await waitFor(() => expect(create).toBeEnabled());
  });

  it('저장 중 취소·삭제를 막고 structured 필드 오류 뒤에도 dialog·값·summary를 보존한다', async () => {
    harness.getDeptScheduleList.mockResolvedValue({
      list: [{
        schdlSn: 7,
        schdlNm: '기존 일정',
        schdlCn: '본문',
        schdlBgngYmd: '20260826',
        schdlEndYmd: '20260826',
        schdlPlcNm: '회의실',
        schdlDeptId: 'D1',
        schdlSeCd: '1',
      }],
    });
    let rejectCreate!: (reason?: unknown) => void;
    harness.createDeptSchedule.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectCreate = reject;
    }));
    render(<ScheduleDeptClient />);
    await screen.findByText('기존 일정');
    fireEvent.click(screen.getByRole('button', { name: /일정 등록/ }));
    const title = screen.getByRole('textbox', { name: /일정명/ });
    fireEvent.change(title, { target: { value: '보존할 신규 일정' } });
    const save = screen.getByRole('button', { name: '저장' });
    const cancel = screen.getByRole('button', { name: '취소' });
    const remove = screen.getByRole('button', { name: '기존 일정 삭제' });

    act(() => {
      fireEvent.click(save);
      fireEvent.click(cancel);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(harness.createDeptSchedule).toHaveBeenCalledTimes(1));
    expect(cancel).toBeDisabled();
    expect(remove).toBeDisabled();
    expect(harness.deleteDeptSchedule).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeVisible();

    await act(async () => rejectCreate({
      response: { data: { errors: [{ field: 'schdlNm', message: '이미 사용 중인 일정명입니다.' }] } },
    }));

    expect(await screen.findByText('이미 사용 중인 일정명입니다.')).toBeVisible();
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(title).toHaveValue('보존할 신규 일정');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent('이미 사용 중인 일정명입니다.');
    expect(cancel).toBeEnabled();
  });
});
