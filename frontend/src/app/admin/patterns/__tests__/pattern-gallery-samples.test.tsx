import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import MasterDetailSample from '../MasterDetailSample';
import ReportSample from '../ReportSample';

const detailPane = () => within(screen.getByTestId('master-detail-detail'));

/**
 * 패턴 갤러리의 A2 + A3·A7 표본이 카탈로그의 필수 동작을 표본 위에서 실제로 하는지.
 * 죽은 컨트롤을 두지 않는다는 G10 이 표본에도 적용된다(pattern-gallery.test.tsx 머리말).
 */
describe('A2 마스터-디테일 + A3 인라인 편집 표본', () => {
  it('항목을 고르기 전에는 미선택 안내를 보이고, 고르면 상세 칸에 편집 폼이 열린다', async () => {
    const user = userEvent.setup();
    render(<MasterDetailSample />);

    expect(screen.getByText('항목을 선택하세요')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /COM002/ }));

    expect(screen.getByRole('button', { name: /COM002/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { level: 3, name: '처리 상태 (COM002)' })).toBeInTheDocument();
    expect(detailPane().getByLabelText(/^이름/)).toHaveValue('처리 상태');
  });

  it('필수 항목을 비우고 저장하면 필드 오류를 보이고 첫 오류 필드로 포커스를 옮긴다', async () => {
    const user = userEvent.setup();
    render(<MasterDetailSample />);

    await user.click(screen.getByRole('button', { name: /COM001/ }));
    const name = detailPane().getByLabelText(/^이름/);
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findAllByText('이름을 입력하세요.')).not.toHaveLength(0);
    await waitFor(() => expect(name).toHaveFocus());
  });

  it('저장하면 표본 목록이 바뀌고 실제 데이터가 아니라는 결과 문구를 보인다', async () => {
    const user = userEvent.setup();
    render(<MasterDetailSample />);

    await user.click(screen.getByRole('button', { name: /COM003/ }));
    const name = detailPane().getByLabelText(/^이름/);
    await user.clear(name);
    await user.type(name, '공개 구분');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('공개 구분 그룹을 표본에 저장했습니다. 실제 데이터는 바뀌지 않습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /COM003/ })).toHaveTextContent('공개 구분');
  });

  it('저장하지 않은 변경이 있으면 다른 항목으로 옮기기 전에 경고하고, 버리기를 고르면 옮긴다', async () => {
    const user = userEvent.setup();
    render(<MasterDetailSample />);

    await user.click(screen.getByRole('button', { name: /COM001/ }));
    await user.type(detailPane().getByLabelText(/^이름/), ' 수정');
    await user.click(screen.getByRole('button', { name: /COM005/ }));

    const warning = (await screen.findByText(/저장하지 않은 변경이 있습니다/)).closest('[role="alert"]') as HTMLElement;
    expect(warning).not.toBeNull();
    expect(screen.getByRole('button', { name: /COM001/ })).toHaveAttribute('aria-current', 'true');

    await user.click(within(warning).getByRole('button', { name: '변경 버리고 이동' }));
    expect(screen.getByRole('button', { name: /COM005/ })).toHaveAttribute('aria-current', 'true');
    expect(detailPane().getByLabelText(/^이름/)).toHaveValue('알림 채널');
  });

  it('Esc 로 변경을 취소한다', async () => {
    const user = userEvent.setup();
    render(<MasterDetailSample />);

    await user.click(screen.getByRole('button', { name: /COM004/ }));
    const name = detailPane().getByLabelText(/^이름/);
    await user.type(name, ' 임시');
    expect(name).toHaveValue('첨부 유형 임시');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(name).toHaveValue('첨부 유형'));
  });

  it('조회 조건으로 마스터를 좁히고, 결과가 없으면 결과 없음을 구분해 보인다(G15)', async () => {
    const user = userEvent.setup();
    render(<MasterDetailSample />);

    await user.type(screen.getByLabelText('코드·이름'), '없는그룹');
    await user.click(screen.getByRole('button', { name: '조회' }));

    expect(screen.queryByRole('button', { name: /COM001/ })).not.toBeInTheDocument();
    expect(within(screen.getByTestId('master-detail-master')).getByRole('status')).toHaveTextContent('없는그룹');
  });
});

describe('A7 현황 + 원본 표 표본', () => {
  it('지표·차트·원본 표가 같은 조회 조건을 따르고 집계 기준을 밝힌다', async () => {
    const user = userEvent.setup();
    render(<ReportSample />);

    expect(screen.getByTestId('report-basis')).toHaveTextContent('정적 표본');
    expect(screen.getAllByTestId(/^pattern-gallery-report-row/)).toHaveLength(5);

    await user.type(within(screen.getByRole('search')).getByLabelText('부서'), '민원');
    await user.click(screen.getByRole('button', { name: '조회' }));

    expect(screen.getAllByTestId(/^pattern-gallery-report-row/)).toHaveLength(1);
    expect(screen.getByTestId('report-summary')).toHaveTextContent('48건');
    expect(screen.getByText('접수 48 · 처리 41')).toBeInTheDocument();
  });
});
