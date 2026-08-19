import { describe, expect, it } from 'vitest';
import { assertCleanupSucceeded } from './cleanup-db';

describe('cleanup-db exit contract', () => {
  it('실패가 없으면 정상 종료한다', () => {
    expect(() => assertCleanupSucceeded([])).not.toThrow();
  });

  it('best-effort 실패를 모두 모은 뒤 AggregateError로 실패한다', () => {
    expect(() => assertCleanupSucceeded([
      { scope: 'Poll', message: 'HTTP 500' },
      { scope: 'Banner', message: 'timeout' },
    ])).toThrow(/2 cleanup operation\(s\) failed[\s\S]*Poll: HTTP 500[\s\S]*Banner: timeout/);
  });
});
