import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import SurveyTemplatesPanel from '../SurveyTemplatesPanel';
import { surveyTemplateCreateSchema } from '../survey-panel-form-validation';

vi.mock('@/services/foundation/system/SurveyAdminService', () => ({
  surveyAdminService: {
    createTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    getTemplateList: vi.fn(),
  },
}));

const mocked = vi.mocked(surveyAdminService);

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SurveyTemplatesPanel />
    </QueryClientProvider>,
  );
}

describe('SurveyTemplatesPanel validation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.createTemplate.mockResolvedValue(undefined);
    mocked.deleteTemplate.mockResolvedValue(undefined);
    mocked.getTemplateList.mockResolvedValue({
      list: [],
      total: 0,
      page: 1,
      size: 50,
      totalPage: 0,
    });
  });

  it('generated SurveyTemplateDto의 유형/설명 최대 길이와 UI 필수를 보존한다', () => {
    const valid = {
      srvyTmpltTypeCd: 'A'.repeat(12),
      srvyTmpltExpln: '가'.repeat(4000),
    };

    expect(surveyTemplateCreateSchema.safeParse(valid).success).toBe(true);
    expect(surveyTemplateCreateSchema.safeParse({ ...valid, srvyTmpltTypeCd: '' }).success).toBe(false);
    expect(surveyTemplateCreateSchema.safeParse({ ...valid, srvyTmpltTypeCd: 'A'.repeat(13) }).success).toBe(false);
    expect(surveyTemplateCreateSchema.safeParse({ ...valid, srvyTmpltExpln: '가'.repeat(4001) }).success).toBe(false);
  });

  it('길이 오류는 write 없이 인라인으로 연결하고 첫 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    renderPanel();
    const type = screen.getByLabelText('템플릿 유형 코드');
    fireEvent.change(type, { target: { value: 'A'.repeat(13) } });

    await user.click(screen.getByRole('button', { name: /템플릿 추가/ }));

    expect(mocked.createTemplate).not.toHaveBeenCalled();
    expect(type).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toHaveTextContent('최대 12자');
    await waitFor(() => expect(type).toHaveFocus());
  });

  it('서버 필드 오류를 인라인으로 연결하고 입력값을 보존한다', async () => {
    mocked.createTemplate.mockRejectedValueOnce({
      response: {
        data: { errors: [{ field: 'srvyTmpltTypeCd', message: '이미 등록된 유형 코드입니다.' }] },
      },
    });
    const user = userEvent.setup();
    renderPanel();
    const type = screen.getByLabelText('템플릿 유형 코드');
    const explanation = screen.getByLabelText('템플릿 설명');
    await user.type(type, 'TYPE_A');
    await user.type(explanation, '보존할 설명');

    await user.click(screen.getByRole('button', { name: /템플릿 추가/ }));

    expect(await screen.findByText('이미 등록된 유형 코드입니다.')).toBeVisible();
    expect(type).toHaveValue('TYPE_A');
    expect(explanation).toHaveValue('보존할 설명');
    expect(type).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(type).toHaveFocus());
  });

  it('pending 시작 전 동기 잠금으로 같은 submit을 한 번만 보낸다', async () => {
    let resolveCreate!: () => void;
    mocked.createTemplate.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveCreate = resolve;
    }));
    const user = userEvent.setup();
    renderPanel();
    await user.type(screen.getByLabelText('템플릿 유형 코드'), 'TYPE_A');
    const submit = screen.getByRole('button', { name: /템플릿 추가/ });
    const form = submit.closest('form');

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    await waitFor(() => expect(mocked.createTemplate).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    await act(async () => {
      resolveCreate();
    });
  });

  it('템플릿 삭제는 같은 tick 중복 요청을 막고 실패 상태를 보존한다', async () => {
    mocked.getTemplateList.mockResolvedValue({
      list: [{
        srvyTmpltSn: 101,
        srvyTmpltTypeCd: 'TYPE_A',
        srvyTmpltExpln: '기본 템플릿',
        frstRgtrId: 'admin',
        crtDt: '2026-08-06T00:00:00',
      }],
      total: 1,
      page: 1,
      size: 50,
      totalPage: 1,
    });
    let rejectDelete!: (reason: unknown) => void;
    mocked.deleteTemplate.mockReturnValueOnce(new Promise<void>((_resolve, reject) => {
      rejectDelete = reject;
    }));
    renderPanel();
    const remove = await screen.findByRole('button', { name: '기본 템플릿 템플릿 삭제' });

    act(() => {
      remove.click();
      remove.click();
    });

    await waitFor(() => expect(mocked.deleteTemplate).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '기본 템플릿 템플릿 삭제 중' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '기본 템플릿 템플릿 삭제 중' })).toHaveAttribute('aria-busy', 'true');
    await act(async () => rejectDelete(new Error('템플릿 삭제 권한이 없습니다.')));
    expect(await screen.findByText('템플릿 삭제 권한이 없습니다.')).toBeVisible();
    expect(screen.getByRole('button', { name: '기본 템플릿 템플릿 삭제' })).toBeEnabled();
  });
});
