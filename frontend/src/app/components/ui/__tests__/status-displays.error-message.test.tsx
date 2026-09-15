import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorStateDisplay } from '../status-displays';

/**
 * [2026-09-15 DEC-OPS-100] 오류 상태의 상세 문구에는 사용자에게 보여 줄 문장만 싣는다.
 *
 * 서버 문구가 없는 axios 오류의 message 는 transport 원문(`Network Error`,
 * `Request failed with status code 500`)이다. 그 문장은 사용자가 무엇을 해야 하는지 말하지 않고
 * 콘텐츠 가이드 §5 가 금지한다. 원문 대신 이 컴포넌트의 기본 안내가 말하게 한다.
 */
describe('ErrorStateDisplay 상세 문구', () => {
  it('서버 문구가 없는 axios 오류는 원문을 보여 주지 않는다', () => {
    const error = Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' });
    render(<ErrorStateDisplay error={error} />);

    expect(screen.queryByText('Network Error')).toBeNull();
    expect(screen.getByText('데이터를 불러오지 못했습니다')).toBeInTheDocument();
  });

  it('서버가 준 문구는 그대로 보여 준다', () => {
    const error = Object.assign(new Error('Request failed with status code 400'), {
      isAxiosError: true,
      response: { status: 400, data: { message: '조회 기간을 확인해 주세요.' } },
    });
    render(<ErrorStateDisplay error={error} />);

    expect(screen.getByText('조회 기간을 확인해 주세요.')).toBeInTheDocument();
    expect(screen.queryByText('Request failed with status code 400')).toBeNull();
  });

  it('axios 가 아닌 오류와 문자열 사유는 그대로 보여 준다', () => {
    const { rerender } = render(<ErrorStateDisplay error={new Error('알림을 불러오지 못했습니다.')} />);
    expect(screen.getByText('알림을 불러오지 못했습니다.')).toBeInTheDocument();

    rerender(<ErrorStateDisplay error="목록을 불러오지 못했습니다." />);
    expect(screen.getByText('목록을 불러오지 못했습니다.')).toBeInTheDocument();
  });
});
