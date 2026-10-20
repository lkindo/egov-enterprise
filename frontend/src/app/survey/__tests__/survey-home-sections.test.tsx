import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { visibleEntries } from '@/extensions/slots';
import surveySections from '@/extensions/survey/home-sections';
import { HOME_SECTION_PERMISSIONS, expectedVisibleWhen } from '@/__tests__/cross-stack/home-section-permissions';

/**
 * [2026-10-20] 업무 홈의 '참여할 설문' 카드(설문 기여). 설문 디렉터리에 두어 설문과 함께 빠진다.
 *
 * - 노출: 카드가 부르는 설문 목록 API 의 권한(SURVEY_READ)이 있는 주체에게만 보인다. 서버 바인딩 대조는
 *   cross-stack/home-section-permission-bindings.test.ts 가 같은 기대값으로 본다.
 * - 내용: 설문 참여 화면과 같은 판정이다 — 진행 중이고(기간), 서버가 실어 준 응답 여부(responded, DEC-OPS-197)가 '응답함' 이 아니고,
 *   작성 중(rlsYn 'N')이 아닌 설문을 센다. 설문이 한 번에 읽는 상한보다 많으면 범위를 밝힌다.
 */
const api = vi.hoisted(() => ({ getSurveys: vi.fn() }));
vi.mock('@/services/foundation/survey/SurveyParticipationService', () => ({
  surveyParticipationService: { getSurveys: api.getSurveys },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user' } }) }));

const { SurveyToAnswerCard } = await import('@/app/components/dashboard/SurveyHome');

type Subject = null | { id: string; permissions: string[]; authorizationVersion?: string };
const SUBJECTS = {
  granted: { id: 'user', permissions: ['DASHBOARD_READ', 'SURVEY_READ'], authorizationVersion: 'v1' },
  // 근접 오답: 관리 목록 권한만 있다 — 카드가 부르는 사용자 목록 API 의 권한이 아니다.
  adminListOnly: { id: 'user', permissions: ['DASHBOARD_READ', 'SURVEY_READ_ALL'], authorizationVersion: 'v1' },
  signedOut: null,
  emptyVersion: { id: 'user', permissions: ['SURVEY_READ'], authorizationVersion: '' },
} satisfies Record<string, Subject>;

describe('업무 홈 참여할 설문 카드의 노출(설문 기여)', () => {
  it.each(Object.keys(SUBJECTS) as (keyof typeof SUBJECTS)[])('노출 행렬 — 주체 %s', (subject) => {
    expect(visibleEntries(SUBJECTS[subject], [surveySections]).map(entry => entry.id))
      .toEqual(subject === 'granted' ? ['surveys-to-answer'] : []);
  });

  it('술어는 설문 목록 API 의 권한(서버 바인딩 대조와 같은 기대값)이고, 요약 카드 줄에 놓인다', () => {
    expect(surveySections.map(entry => [entry.id, entry.visibleWhen]))
      .toEqual(expectedVisibleWhen(HOME_SECTION_PERMISSIONS.survey.sections));
    expect(surveySections.map(entry => [entry.placement, entry.order])).toEqual([['cards', 26]]);
  });
});

describe('참여할 설문 카드의 내용', () => {
  const renderCard = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ul><SurveyToAnswerCard /></ul>
    </QueryClientProvider>,
  );
  const survey = (srvySn: number, srvyTtl: string, extra: Record<string, unknown> = {}) => ({
    srvySn, srvyTtl, srvyBgngYmd: '20261001', srvyEndYmd: '20261031', ...extra,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 20, 9, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('진행 중이고 응답하지 않은 공개 설문만 세어 설문 화면으로 잇는다', async () => {
    api.getSurveys.mockResolvedValue({
      list: [
        survey(1, '만족도 조사', { responded: false, rlsYn: 'Y' }),
        survey(2, '이미 응답한 조사', { responded: true, rlsYn: 'Y' }),
        survey(3, '응답 여부 미상 조사'),
        survey(4, '작성 중 조사', { responded: false, rlsYn: 'N' }),
        survey(5, '종료된 조사', { srvyEndYmd: '20261019', responded: false }),
        survey(6, '예정 조사', { srvyBgngYmd: '20261021', responded: false }),
      ],
      total: 6,
    });
    renderCard();

    const link = await screen.findByRole('link', { name: /^참여할 설문/ });
    await waitFor(() => expect(link).toHaveTextContent('참여할 설문2건'));
    expect(link).toHaveAttribute('href', '/survey');
    expect(api.getSurveys).toHaveBeenCalledWith({ page: 1, size: 100 });
    const items = within(screen.getByRole('list', { name: '참여할 설문 최근 항목' })).getAllByRole('listitem');
    expect(items.map(item => item.textContent)).toEqual(['만족도 조사', '응답 여부 미상 조사']);
  });

  it('설문이 한 번에 읽는 상한보다 많으면 센 범위를 밝힌다', async () => {
    api.getSurveys.mockResolvedValue({ list: [survey(1, '만족도 조사')], total: 140 });
    renderCard();

    expect(await screen.findByText('설문 1건에서 셌습니다.')).toBeInTheDocument();
  });

  it('조회에 실패하면 0건이 아니라 조회 실패라고 말한다', async () => {
    api.getSurveys.mockRejectedValue(new Error('down'));
    renderCard();

    const link = await screen.findByRole('link', { name: /^참여할 설문/ });
    await waitFor(() => expect(link).toHaveTextContent('조회 실패'));
    expect(screen.queryByText('0건')).toBeNull();
  });
});
