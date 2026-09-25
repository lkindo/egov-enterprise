import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataExportExcel, exportFileDate, toCsvCell } from '../data-export-excel';

/**
 * [2026-09-25 DIP S2] CSV 수식 주입 방지와 한국 날짜 파일명.
 *
 * 내보낸 파일은 관리자가 엑셀로 연다. 사용자가 입력한 제목·이름이 `=`·`+`·`-`·`@`·탭·CR 로
 * 시작하면 엑셀이 그것을 수식으로 실행할 수 있다 — 앞에 `'` 를 붙여 글자로 고정한다.
 */
describe('DataExportExcel 수식 주입 방지', () => {
  it.each([
    ['=HYPERLINK("http://x","클릭")', `"'=HYPERLINK(""http://x"",""클릭"")"`],
    ['+1+1', `"'+1+1"`],
    ['-2+3', `"'-2+3"`],
    ['@SUM(A1)', `"'@SUM(A1)"`],
    ['\t=cmd', `"'\t=cmd"`],
    ['\r=cmd', `"'\r=cmd"`],
  ])('수식 시작 글자 %j 는 텍스트로 고정한다', (value, expected) => {
    expect(toCsvCell(value)).toBe(expected);
  });

  it('평범한 값·숫자·빈 값은 그대로 둔다 — 측정값 음수를 글자로 바꾸지 않는다', () => {
    expect(toCsvCell('홍길동')).toBe('"홍길동"');
    expect(toCsvCell('a=b')).toBe('"a=b"');
    expect(toCsvCell(-5)).toBe('"-5"');
    expect(toCsvCell(0)).toBe('"0"');
    expect(toCsvCell(null)).toBe('""');
    expect(toCsvCell(undefined)).toBe('""');
  });

  it('파일명 날짜는 브라우저 시간대가 아니라 한국 날짜다', () => {
    // UTC 2026-09-24 20:00 = KST 2026-09-25 05:00 — toISOString 은 하루 전 날짜를 준다.
    expect(exportFileDate(new Date('2026-09-24T20:00:00Z'))).toBe('2026-09-25');
    expect(exportFileDate(new Date('2026-09-25T14:59:00Z'))).toBe('2026-09-25');
  });
});

describe('DataExportExcel 내려받기', () => {
  const chunks: string[] = [];

  beforeEach(() => {
    chunks.length = 0;
    vi.stubGlobal('Blob', class {
      constructor(parts: string[]) {
        chunks.push(...parts);
      }
    });
    URL.createObjectURL = vi.fn(() => 'blob:export');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('행 값에 수식이 있으면 파일에는 글자로 고정된 값이 실린다', () => {
    render(
      <DataExportExcel
        scope="loaded"
        data={[{ title: '=1+1', count: -3 }]}
        headers={[
          { label: '제목', key: 'title' },
          { label: '건수', key: 'count' },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /엑셀 내보내기/ }));

    const csv = chunks.join('');
    expect(csv).toContain(`"'=1+1","-3"`);
    expect(csv).not.toContain('"=1+1"');
  });
});
