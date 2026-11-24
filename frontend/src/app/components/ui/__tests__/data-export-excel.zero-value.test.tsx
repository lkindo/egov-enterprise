import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataExportExcel } from '../data-export-excel';

/**
 * [2026-09-15 DEC-OPS-100] 내보내기는 측정값 0 을 빈 칸으로 바꾸지 않는다.
 *
 * 종전 `row[key] || ''` 는 0 을 빈 칸으로 만들어, 화면의 "접속 건수 0" 이 파일에서는 값이 없는
 * 것처럼 보였다. 이 컴포넌트는 모든 프로필에 들어가므로 통계·로그·감사 내보내기 전부에 해당했다.
 */
describe('DataExportExcel 값 표기', () => {
  const chunks: string[] = [];

  beforeEach(() => {
    chunks.length = 0;
    vi.stubGlobal('Blob', class {
      constructor(parts: string[]) {
        chunks.push(...parts);
      }
    });
    URL.createObjectURL = vi.fn(() => 'blob:export');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('측정값 0 은 0 으로 내보내고, 값이 없을 때만 빈 칸으로 둔다', () => {
    render(
      <DataExportExcel
        scope="loaded"
        data={[{ statsDate: '20260915', statsCo: 0, prcsTm: null }]}
        headers={[
          { label: '집계 일자', key: 'statsDate' },
          { label: '접속 건수', key: 'statsCo' },
          { label: '처리시간(ms)', key: 'prcsTm' },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /엑셀 내보내기/ }));

    expect(chunks.join('')).toContain('"20260915","0",""');
  });

  it('[2026-11-24] 내려받기를 시작한 뒤 Blob URL 을 놓는다', () => {
    vi.useFakeTimers();
    try {
      const revoke = vi.fn();
      URL.revokeObjectURL = revoke;
      render(<DataExportExcel scope="loaded" data={[{ statsCo: 1 }]} headers={[{ label: '접속 건수', key: 'statsCo' }]} />);

      fireEvent.click(screen.getByRole('button', { name: /엑셀 내보내기/ }));
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
      expect(revoke).not.toHaveBeenCalled();

      vi.runAllTimers();
      expect(revoke).toHaveBeenCalledWith('blob:export');
    } finally {
      vi.useRealTimers();
    }
  });
});
