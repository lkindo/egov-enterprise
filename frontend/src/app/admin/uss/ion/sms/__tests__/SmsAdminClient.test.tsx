import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  replace: vi.fn(),
  sendSms: vi.fn(),
  getSmsList: vi.fn(),
  toast: vi.fn(),
  queries: {} as Record<string, { queryFn?: () => unknown }>,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/uss/ion/sms',
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(),
}));

// [2026-08-29] useQuery 가 받은 options 를 붙잡는다. 종전에는 통째로 대체해 queryFn 이 한 번도
//   실행되지 않았고, 그래서 "요청에 무엇을 싣는가" 를 이 스펙이 볼 수 없었다(조회 조건 누락이
//   여기서 안 잡힌 이유다). 반환값은 그대로라 기존 스펙 거동은 변하지 않는다.
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: unknown[]; queryFn?: () => unknown }) => {
    // 이 화면에는 useQuery 가 둘이다(목록·수신자). queryKey 로 갈라 담지 않으면 마지막 것만
    // 남아 목록 요청을 검사할 수 없다.
    mocks.queries[String(options.queryKey?.[0])] = options;
    return {
      data: { list: [], total: 0, totalPage: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
    };
  },
}));

vi.mock('@/services/foundation/operation/SmsAdminService', () => ({
  smsAdminService: {
    getSmsList: mocks.getSmsList,
    getSmsRecipients: vi.fn(),
    sendSms: mocks.sendSms,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/app/components/patterns/empty-result-message', () => ({ emptyResultMessage: (_value: string, fallback: string) => fallback }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, filter, children }: React.PropsWithChildren<{ actions?: React.ReactNode; filter?: React.ReactNode }>) => (
    <main>{actions}{filter}{children}</main>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({ StandardDataTable: () => <div /> }));

import SmsAdminClient from '../SmsAdminClient';

async function openSmsForm(user: ReturnType<typeof userEvent.setup>) {
  render(<SmsAdminClient initialSmsList={null} />);
  await user.click(screen.getByRole('button', { name: /새 메시지 구성/ }));
  const dialog = await screen.findByRole('dialog');
  const scope = within(dialog);
  const recipient = scope.getByPlaceholderText('010-0000-0000');
  const content = scope.getByPlaceholderText('메시지 내용을 입력하세요...');
  const submit = scope.getByRole('button', { name: /발송/ });
  return { recipient, content, submit, form: submit.closest('form')! };
}

/**
 * [2026-08-29] 조회 조건이 서버까지 실제로 전달된다.
 *
 * 종전에는 키워드만 보냈다. 서버의 SmsRepositoryImpl.searchExpression 은 조건이
 * '0'(수신전화번호)·'1'(전송내용) 이 아니면 null(= 필터 없음)을 돌려주므로, 무엇을
 * 입력해도 전체 목록이 그대로 나왔고 화면은 그것을 검색 결과처럼 보여 줬다. 관리자는
 * "그 번호로 보낸 이력이 이만큼" 이라고 잘못 읽는다.
 *
 * 라벨도 실제 축과 달랐다 — 서버가 번호로 거르는 축은 **수신**전화번호이고 발신번호로
 * 거르는 경로는 없는데 화면은 '발신번호 · 내용' 이라고 말했다.
 */
describe('SMS 조회 조건 전달', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSmsList.mockResolvedValue({ list: [], total: 0, totalPage: 1 });
  });

  it('검색어와 함께 서버가 해석하는 조회 조건을 보낸다', async () => {
    const user = userEvent.setup();
    render(<SmsAdminClient initialSmsList={null} />);

    await user.type(screen.getByRole('textbox', { name: '문자 발송 이력 검색어' }), '안내');
    await act(async () => { await mocks.queries['admin-sms']?.queryFn?.(); });

    expect(mocks.getSmsList).toHaveBeenCalledWith(
      expect.objectContaining({ searchCondition: '1', searchKeyword: '안내' }),
    );
  });

  it('수신번호 축을 고르면 그 축으로 보낸다', async () => {
    const user = userEvent.setup();
    render(<SmsAdminClient initialSmsList={null} />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: '문자 발송 이력 검색 조건' }), '0');
    await user.type(screen.getByRole('textbox', { name: '문자 발송 이력 검색어' }), '010');
    await act(async () => { await mocks.queries['admin-sms']?.queryFn?.(); });

    expect(mocks.getSmsList).toHaveBeenCalledWith(
      expect.objectContaining({ searchCondition: '0', searchKeyword: '010' }),
    );
  });

  it('화면이 서버에 없는 검색 축을 약속하지 않는다', () => {
    render(<SmsAdminClient initialSmsList={null} />);
    // 발신번호로 거르는 경로가 서버에 없다 — 있는 것처럼 말하지 않는다.
    expect(screen.queryByText(/발신번호/)).toBeNull();
  });
});

describe('SmsAdminClient send validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendSms.mockResolvedValue(1);
  });

  it('라벨을 실제 입력 컨트롤의 접근 가능한 이름으로 연결한다', async () => {
    const fields = await openSmsForm(userEvent.setup());

    expect(fields.recipient).toHaveAccessibleName(/수신 번호.*필수/);
    expect(fields.content).toHaveAccessibleName(/메시지 내용.*필수/);
  });

  it('공백 수신 번호를 write sink로 보내지 않고 summary와 첫 오류 이동을 제공한다', async () => {
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '   ');
    await user.type(fields.content, '전송할 문자');

    fireEvent.submit(fields.form);

    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/수신 번호.*입력/)).not.toHaveLength(0);
    expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument();
    await waitFor(() => expect(fields.recipient).toHaveFocus());
  });

  it('숫자와 하이픈 외 문자가 포함된 수신 번호를 차단한다', async () => {
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-ABCD-1234');
    await user.type(fields.content, '전송할 문자');

    fireEvent.submit(fields.form);

    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/숫자와 하이픈/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.recipient).toHaveFocus());
  });

  it('80자를 넘는 메시지는 write sink로 보내지 않는다', async () => {
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-1234-5678');
    fireEvent.change(fields.content, { target: { value: '가'.repeat(81) } });

    fireEvent.submit(fields.form);

    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/최대 80자/)).not.toHaveLength(0);
    expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument();
  });

  it('서버 필드 오류를 수신 번호에 연결하고 입력값을 보존한다', async () => {
    mocks.sendSms.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'rcptnTelno', message: '발송할 수 없는 수신 번호입니다.' }] } },
    });
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '보존할 문자 내용');

    fireEvent.submit(fields.form);

    expect(await screen.findAllByText('발송할 수 없는 수신 번호입니다.')).not.toHaveLength(0);
    expect(fields.recipient).toHaveValue('010-1234-5678');
    expect(fields.content).toHaveValue('보존할 문자 내용');
    await waitFor(() => expect(fields.recipient).toHaveFocus());
  });

  it('일반 서버 오류는 실제 메시지를 안내하고 입력값을 보존한다', async () => {
    mocks.sendSms.mockRejectedValueOnce(new Error('문자 게이트웨이에 연결할 수 없습니다.'));
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '보존할 문자 내용');

    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('문자 게이트웨이에 연결할 수 없습니다.', 'error'));
    expect(fields.recipient).toHaveValue('010-1234-5678');
    expect(fields.content).toHaveValue('보존할 문자 내용');
  });

  it('발송 pending 중 동기 재제출해도 write sink를 한 번만 호출한다', async () => {
    let resolveSend!: (value: number) => void;
    mocks.sendSms.mockReturnValueOnce(new Promise<number>((resolve) => { resolveSend = resolve; }));
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '중복 방지 문자');

    act(() => {
      fireEvent.submit(fields.form);
      fireEvent.submit(fields.form);
    });

    await waitFor(() => expect(mocks.sendSms).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    resolveSend(1);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('발송 요청을 접수했습니다. 전달 결과는 목록의 ‘수신자 결과’에서 확인하세요.', 'info'));
  });

  it('발송 중 취소·Escape를 막고 서버 필드 오류 뒤에도 입력 위치를 보존한다', async () => {
    let rejectSend!: (reason?: unknown) => void;
    mocks.sendSms.mockReturnValueOnce(new Promise<number>((_resolve, reject) => { rejectSend = reject; }));
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '오류 뒤에도 보존할 문자');

    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.sendSms).toHaveBeenCalledTimes(1));
    const cancel = screen.getByRole('button', { name: '취소' });
    expect(cancel).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeVisible();

    await act(async () => rejectSend({
      response: { data: { errors: [{ field: 'rcptnTelno', message: '발송 대상을 다시 확인하세요.' }] } },
    }));
    expect(await screen.findAllByText('발송 대상을 다시 확인하세요.')).not.toHaveLength(0);
    expect(fields.recipient).toHaveValue('010-1234-5678');
    expect(fields.content).toHaveValue('오류 뒤에도 보존할 문자');
    expect(cancel).toBeEnabled();
  });
});

/**
 * 발송 결과를 **말할 수 있는지**를 고정한다.
 *
 * SmsSender 구현체는 LoggingSmsSender(@Profile !prod)·UnavailableSmsSender(@Profile prod)
 * 둘뿐이고 **둘 다 무조건 false 를 반환**한다. SmsAsyncProcessor 가 재시도 3회를 소진한 뒤
 * @Recover 에서 전 수신자를 rsltCd='F'(Gateway delivery failed)로 확정한다. 그런데 화면은
 * HTTP 200 직후 초록 '문자 메시지를 발송했습니다.' 를 띄웠다 — 관리자가 인증 문자가 나갔다고
 * 믿고 업무를 진행하는 것이 실제 피해다.
 *
 * 문구만 고치면 다음 사람이 되돌린다. '전달을 단정하지 않는다'와 '결과를 볼 경로가 있다'
 * 두 축을 함께 고정한다.
 */
describe('SMS 발송 결과 고지', () => {
  // 주석 안의 문자열을 세면 "주석만 남기면 통과"가 되어 계약이 무력해진다.
  const source = readFileSync(path.resolve(__dirname, '..', 'SmsAdminClient.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

  it('성공 경로가 전달 완료를 단정하지 않는다', () => {
    expect(source).not.toContain('발송했습니다');
    expect(source).toContain('접수했습니다');
  });

  /**
   * 같은 sendSms 위에 올라탄 소비자가 하나 더 있다. 이 계약이 이 파일만 검사하면 그쪽은
   * 게이트 밖이라, 한 화면만 고치고 다른 화면은 계속 '성공적으로 전송되었습니다' 를 띄운다.
   * 지금은 next.config 리다이렉트로 도달 불가지만 리다이렉트는 걷힐 수 있다(DEC-OPS-024).
   */
  it('같은 API 를 쓰는 다른 화면도 전달을 단정하지 않는다', () => {
    const hub = readFileSync(
      path.resolve(__dirname, '..', '..', '..', '..', '..', 'cop', 'sms', 'selectSmsList', 'SmsHubClient.tsx'),
      'utf8',
    )
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');

    expect(hub, 'sendSms 소비자가 맞는지 확인').toContain('sendSms');
    expect(hub).not.toContain('성공적으로 전송되었습니다');
    expect(hub).toContain('접수했습니다');
  });

  it('수신자별 실제 결과를 볼 경로가 화면에 있다', () => {
    // 결과를 볼 방법이 없으면 '접수했다'는 안내조차 확인할 수 없다.
    expect(source).toContain('getSmsRecipients');
  });

  it('서버 결과 코드 세 가지를 모두 사용자 어휘로 옮긴다', () => {
    // 'P'(대기)를 빠뜨리면 아직 처리 중인 건이 '알 수 없음'으로 보인다.
    for (const code of ["'S'", "'F'", "'P'"]) {
      expect(source, `결과 코드 ${code} 처리가 없다`).toContain(code);
    }
  });

  /**
   * 결과를 사후에 정직하게 말하는 것만으로는 부족하다 — **보내기 전에** 알려야 한다.
   *
   * 전송 구현체는 두 프로필 모두 무조건 실패다. 즉 이 화면에서 누르는 발송은 100% 실패가
   * 확정돼 있는데, 종전에는 아무 사전 고지 없이 작성·발송을 유도했다. 관리자는 인증 문자를
   * 다 쓴 뒤에야 결과를 뒤져 실패를 알게 된다.
   */
  it('게이트웨이 미연동을 보내기 전에 고지한다', () => {
    expect(source).toContain('문자 게이트웨이가 연동되어 있지 않아');
    expect(source).toContain('‘실패’로 기록됩니다');
  });

  /**
   * 그 고지를 **실제 구현체와 양방향으로 묶는다.**
   *
   * 배너만 하드코딩하면, 나중에 진짜 게이트웨이가 붙었을 때 화면이 반대로 거짓말한다.
   * 저장소의 SmsSender 구현체를 전수로 읽어 하나라도 성공을 돌려주면 이 계약이 red 가 되게
   * 한다 — 그때 배너를 걷어내라는 신호다.
   */
  it('배너는 "모든 sender 가 실패를 돌려준다"는 사실에 결속돼 있다', () => {
    const senderDir = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', '..', '..',
      'business-app', 'src', 'main', 'java', 'nuri', 'business', 'service', 'sms');
    const senders = readdirSync(senderDir).filter((name) => /SmsSender\.java$/.test(name));

    // 구현체가 사라지면 이 검사가 vacuous 하게 통과한다 — 그 자체를 실패로 본다.
    expect(senders.length).toBeGreaterThanOrEqual(2);

    for (const name of senders) {
      if (name === 'SmsSender.java') continue; // 인터페이스
      const body = readFileSync(path.join(senderDir, name), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/.*$/gm, ' ');
      expect(body, `${name} 가 성공을 돌려주면 미연동 배너는 거짓이 된다`).not.toMatch(/return\s+true\s*;/);
    }
  });

  /**
   * 전달은 비동기이고 전역 캐시는 60초 fresh 다. 성공 경로에 새로고침이 없으면 토스트가
   * 시키는 대로 결과를 보러 와도 '대기 중'만 보고, 그 뒤 60초 동안 실제 실패를 볼 수 없다.
   */
  it('수신자 결과를 성공 경로에서도 다시 읽을 수 있다', () => {
    expect(source).toContain('결과 새로고침');
  });
});
