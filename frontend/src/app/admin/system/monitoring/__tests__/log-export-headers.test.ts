import { describe, expect, it } from 'vitest';
import { LOGIN_LOG_EXPORT_HEADERS } from '../log-export-headers';

describe('monitoring log export contracts', () => {
  it('exports only generated LoginLogDto fields, including failure details', () => {
    expect(LOGIN_LOG_EXPORT_HEADERS).toEqual([
      { label: '로그ID', key: 'logId' },
      { label: '로그인ID', key: 'loginId' },
      { label: '로그인방식', key: 'loginMthd' },
      { label: '접속IP', key: 'loginIp' },
      { label: '오류여부', key: 'errOccrrAt' },
      { label: '오류코드', key: 'errorCode' },
      { label: '일시', key: 'creatDt' },
    ]);
  });
});
