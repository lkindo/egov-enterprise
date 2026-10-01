import { describe, expect, it, vi } from 'vitest';
import { COMMAND_CENTER_OPEN_EVENT, requestCommandCenter } from '../command-center-bridge';

describe('명령 센터 열기 요청', () => {
  it('헤더 버튼이 보내는 요청은 명령 센터가 듣는 이벤트 하나다', () => {
    const listener = vi.fn();
    window.addEventListener(COMMAND_CENTER_OPEN_EVENT, listener);
    requestCommandCenter();
    window.removeEventListener(COMMAND_CENTER_OPEN_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
