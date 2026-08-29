import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardMakerWizard, boardMakerFormSchema } from '../BoardMakerWizard';

const { createBoardMaster, createMenu } = vi.hoisted(() => ({
  createBoardMaster: vi.fn(),
  createMenu: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { createBoardMaster },
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: { createMenu },
}));
vi.mock('../BoardPreview', () => ({ BoardPreview: () => null }));

const validDraft = {
  bbsTtl: '사내 소식',
  bbsExpln: '',
  // [2026-08-29] 마법사가 두 값을 사용자에게 묻지 않게 되면서 폼 스키마의 boolean 덮어쓰기도
  //   사라졌다. 이제 생성 DTO 스키마의 'Y'|'N' 이 그대로 적용된다(마법사는 각각 'N'·'Y' 고정 전송).
  ansPsbltyYn: 'N',
  fileAtchPsbltyYn: 'Y',
  atchPsbltyFileQty: 3,
  atchPsbltyFileSz: 5_242_880,
  bbsTypeCd: 'BBST01',
  bbsAtrbCd: 'BBSA01',
  tmpltId: 'TMPLT_HUB',
  useYn: 'Y',
  menuNm: '사내 소식',
  upperMenuNo: '2000000',
  menuOrdr: 1,
};

describe('BoardMakerWizard validation', () => {
  beforeEach(() => {
    createBoardMaster.mockReset();
    createMenu.mockReset();
    createMenu.mockResolvedValue(undefined);
  });

  it('preserves board/menu DTO text and integer boundaries', () => {
    expect(boardMakerFormSchema.safeParse(validDraft).success).toBe(true);
    expect(boardMakerFormSchema.safeParse({ ...validDraft, bbsTtl: '가'.repeat(101) }).success).toBe(false);
    expect(boardMakerFormSchema.safeParse({ ...validDraft, bbsExpln: '가'.repeat(4001) }).success).toBe(false);
    expect(boardMakerFormSchema.safeParse({ ...validDraft, menuNm: '가'.repeat(101) }).success).toBe(false);
    expect(boardMakerFormSchema.safeParse({ ...validDraft, menuOrdr: 1.5 }).success).toBe(false);
  });

  it('does not advance on an invalid first step and exposes summary, inline error, and focus', async () => {
    render(<BoardMakerWizard />);
    const title = screen.getByRole('textbox', { name: '게시판 명칭' });

    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));

    expect(createBoardMaster).not.toHaveBeenCalled();
    expect(await screen.findByText('게시판 명칭을 2자 이상 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText(/입력 오류 1개/)).toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByRole('heading', { name: '기본 설정' })).toBeInTheDocument();
  });

  it('reveals the hidden owning step and preserves values for a server field error', async () => {
    createBoardMaster.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'bbsTtl', message: '같은 게시판 명칭이 이미 존재합니다.' }] } },
    });
    render(<BoardMakerWizard />);
    const title = screen.getByRole('textbox', { name: '게시판 명칭' });
    fireEvent.change(title, { target: { value: '사내 소식' } });

    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '템플릿 선택' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '접근 권한 안내' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '메뉴 배포' });
    expect(createBoardMaster).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '게시판 생성 및 메뉴 배포' }));

    expect(await screen.findByText('같은 게시판 명칭이 이미 존재합니다.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '기본 설정' })).toBeInTheDocument();
    const restoredTitle = screen.getByRole('textbox', { name: '게시판 명칭' });
    expect(restoredTitle).toHaveValue('사내 소식');
    await waitFor(() => expect(restoredTitle).toHaveFocus());
  });

  it('same-tick의 최종 배포 중복 제출을 한 번만 전송하고 버튼을 잠근다', async () => {
    let resolveBoard: (id: string) => void = () => undefined;
    createBoardMaster.mockReturnValueOnce(new Promise<string>((resolve) => { resolveBoard = resolve; }));
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), {
      target: { value: '사내 소식' },
    });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '템플릿 선택' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '접근 권한 안내' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '메뉴 배포' });
    expect(createBoardMaster).not.toHaveBeenCalled();
    const submit = screen.getByRole('button', { name: '게시판 생성 및 메뉴 배포' });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    act(() => {
      fireEvent.submit(form!);
      fireEvent.submit(form!);
    });

    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();

    await act(async () => resolveBoard('BBS_TEST'));
    await waitFor(() => expect(createMenu).toHaveBeenCalledTimes(1));
  });
});
